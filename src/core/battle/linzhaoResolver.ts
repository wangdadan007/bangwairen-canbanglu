import { appendLog } from '../log/actionLog'
import { drawCards } from './drawResolver'
import { settleVictoryIfNeeded } from './victoryResolver'
import type {
  ActiveLinzhaoState,
  CardDefinition,
  CardInstance,
  CombatState,
  EnemyInstanceId,
  EnemyState,
  GameEntityId,
  PlaceLinzhaoEffect,
} from '../../types'

export const MAX_ACTIVE_LINZHAO = 2

export type LinzhaoPlayBlockReason = 'linzhao_limit_reached' | 'linzhao_duplicate'

export function getPlaceLinzhaoEffect(
  cardDefinition: CardDefinition,
): PlaceLinzhaoEffect | undefined {
  return cardDefinition.effects.find(
    (effect): effect is PlaceLinzhaoEffect => effect.type === 'PLACE_LINZHAO',
  )
}

export function isLinzhaoCardDefinition(cardDefinition: CardDefinition) {
  return Boolean(getPlaceLinzhaoEffect(cardDefinition))
}

export function getLinzhaoPlayBlockReason(
  state: CombatState,
  cardDefinition: CardDefinition,
): LinzhaoPlayBlockReason | undefined {
  const effect = getPlaceLinzhaoEffect(cardDefinition)

  if (!effect) {
    return undefined
  }

  if (state.linzhao.some((active) => active.linzhaoId === effect.linzhaoId)) {
    return 'linzhao_duplicate'
  }

  if (state.linzhao.length >= MAX_ACTIVE_LINZHAO) {
    return 'linzhao_limit_reached'
  }

  return undefined
}

export function placeLinzhao(
  state: CombatState,
  card: CardInstance,
  effect: PlaceLinzhaoEffect,
): CombatState {
  const blockReason = getLinzhaoPlayBlockReasonFromEffect(state, effect)

  if (blockReason) {
    return appendLog(state, {
      type: 'CARD_PLAY_REJECTED',
      sourceId: card.instanceId,
      payload: {
        reason: blockReason,
        linzhaoId: effect.linzhaoId,
        limit: MAX_ACTIVE_LINZHAO,
      },
    })
  }

  const active: ActiveLinzhaoState = {
    id: `linzhao_${card.instanceId}_${effect.linzhaoId}`,
    linzhaoId: effect.linzhaoId,
    nameKey: effect.nameKey,
    rulesTextKey: effect.rulesTextKey,
    trigger: effect.trigger,
    sourceCardInstanceId: card.instanceId,
    sourceCardDefinitionId: card.definitionId,
    placedTurn: state.turn,
    amount: Math.max(0, Math.floor(effect.amount ?? 0)),
    namedAmount:
      effect.namedAmount === undefined ? undefined : Math.max(0, Math.floor(effect.namedAmount)),
    firstTriggerDraw: Math.max(0, Math.floor(effect.firstTriggerDraw ?? 0)),
    firstTriggerIncense: Math.max(0, Math.floor(effect.firstTriggerIncense ?? 0)),
    recurringIncense: Math.max(0, Math.floor(effect.recurringIncense ?? 0)),
    triggeredTurnIds: [],
    triggerCount: 0,
  }

  return appendLog(
    {
      ...state,
      linzhao: [...state.linzhao, active],
    },
    {
      type: 'LINZHAO_PLACED',
      sourceId: card.instanceId,
      payload: {
        activeLinzhaoId: active.id,
        linzhaoId: active.linzhaoId,
        nameKey: active.nameKey,
        trigger: active.trigger,
        activeCount: state.linzhao.length + 1,
        limit: MAX_ACTIVE_LINZHAO,
      },
    },
  )
}

export function triggerLinzhaoAfterAskName(
  state: CombatState,
  input: {
    readonly sourceId: GameEntityId
    readonly targetEnemyInstanceId?: EnemyInstanceId
  },
): CombatState {
  const target = findEnemy(state, input.targetEnemyInstanceId)
  let nextState = state

  for (const active of nextState.linzhao) {
    if (active.trigger !== 'ask_name_next_break' || hasTriggeredThisTurn(active, nextState.turn)) {
      continue
    }

    const amount = getLinzhaoAmountForTarget(active, target)

    if (amount <= 0) {
      continue
    }

    nextState = markLinzhaoTriggered(nextState, active.id, input.targetEnemyInstanceId, {
      result: 'prepared_break_bonus',
      amount,
    })
    nextState = {
      ...nextState,
      pendingLinzhaoBreakShapeBonus: {
        activeLinzhaoId: active.id,
        linzhaoId: active.linzhaoId,
        nameKey: active.nameKey,
        amount: (nextState.pendingLinzhaoBreakShapeBonus?.amount ?? 0) + amount,
        expiresTurn: nextState.turn,
      },
    }
  }

  return nextState
}

export function consumePendingLinzhaoBreakShapeBonus(
  state: CombatState,
  targetEnemyInstanceId: EnemyInstanceId,
): {
  readonly state: CombatState
  readonly bonusAmount: number
} {
  const pendingBonus = state.pendingLinzhaoBreakShapeBonus

  if (!pendingBonus) {
    return {
      state,
      bonusAmount: 0,
    }
  }

  if (pendingBonus.expiresTurn !== state.turn) {
    return {
      state: {
        ...state,
        pendingLinzhaoBreakShapeBonus: undefined,
      },
      bonusAmount: 0,
    }
  }

  const nextState = appendLog(
    {
      ...state,
      pendingLinzhaoBreakShapeBonus: undefined,
    },
    {
      type: 'LINZHAO_TRIGGERED',
      sourceId: pendingBonus.activeLinzhaoId,
      targetId: targetEnemyInstanceId,
      payload: {
        activeLinzhaoId: pendingBonus.activeLinzhaoId,
        linzhaoId: pendingBonus.linzhaoId,
        nameKey: pendingBonus.nameKey,
        trigger: 'ask_name_next_break',
        result: 'consumed_break_bonus',
        amount: pendingBonus.amount,
      },
    },
  )

  return {
    state: nextState,
    bonusAmount: pendingBonus.amount,
  }
}

export function triggerLinzhaoAfterIncomingForceSealed(
  state: CombatState,
  input: {
    readonly targetEnemyInstanceId: EnemyInstanceId
    readonly sealedAmount: number
    readonly remainingIncomingForce: number
  },
): CombatState {
  if (input.sealedAmount <= 0 || input.remainingIncomingForce > 0) {
    return state
  }

  return triggerSealOrCounterLinzhao(state, input.targetEnemyInstanceId, 'break_after_full_seal')
}

export function triggerLinzhaoAfterAbnormalMovePrevented(
  state: CombatState,
  input: {
    readonly enemyInstanceId: EnemyInstanceId
  },
): CombatState {
  return triggerSealOrCounterLinzhao(state, input.enemyInstanceId, 'break_after_counter')
}

export function triggerLinzhaoAfterCardAnnotationTriggered(
  state: CombatState,
  input: {
    readonly targetEnemyInstanceId?: EnemyInstanceId
  } = {},
): CombatState {
  let nextState = state

  for (const active of nextState.linzhao) {
    if (active.trigger !== 'red_ink_engine') {
      continue
    }

    if (active.triggerCount > 0 && hasTriggeredThisTurn(active, nextState.turn)) {
      continue
    }

    const isFirstTrigger = active.triggerCount === 0
    const drawCount = isFirstTrigger ? active.firstTriggerDraw : 0
    const incenseAmount = isFirstTrigger ? active.firstTriggerIncense : active.recurringIncense

    if (drawCount <= 0 && incenseAmount <= 0) {
      continue
    }

    nextState = markLinzhaoTriggered(nextState, active.id, input.targetEnemyInstanceId, {
      result: isFirstTrigger ? 'red_ink_first_trigger' : 'red_ink_turn_trigger',
      drawCount,
      incenseAmount,
    })

    if (incenseAmount > 0) {
      const updatedPlayer = {
        ...nextState.player,
        incense: nextState.player.incense + incenseAmount,
      }
      nextState = appendLog(
        {
          ...nextState,
          player: updatedPlayer,
        },
        {
          type: 'INCENSE_GAINED',
          sourceId: active.id,
          targetId: 'player',
          payload: {
            amount: incenseAmount,
            currentIncense: updatedPlayer.incense,
          },
        },
      )
    }

    if (drawCount > 0) {
      nextState = drawCards(nextState, drawCount)
    }
  }

  return nextState
}

function triggerSealOrCounterLinzhao(
  state: CombatState,
  targetEnemyInstanceId: EnemyInstanceId,
  result: 'break_after_full_seal' | 'break_after_counter',
): CombatState {
  let nextState = state

  for (const active of nextState.linzhao) {
    if (active.trigger !== 'seal_or_counter_break' || hasTriggeredThisTurn(active, nextState.turn)) {
      continue
    }

    const target = findEnemy(nextState, targetEnemyInstanceId)
    const amount = getLinzhaoAmountForTarget(active, target)

    if (!target || amount <= 0) {
      continue
    }

    nextState = markLinzhaoTriggered(nextState, active.id, target.instanceId, {
      result,
      amount,
    })
    nextState = breakEnemyByLinzhao(nextState, active, target.instanceId, amount)
  }

  return nextState
}

function markLinzhaoTriggered(
  state: CombatState,
  activeLinzhaoId: string,
  targetEnemyInstanceId: EnemyInstanceId | undefined,
  payload: Record<string, string | number>,
): CombatState {
  const active = state.linzhao.find((candidate) => candidate.id === activeLinzhaoId)

  if (!active) {
    return state
  }

  const alreadyMarkedThisTurn = active.triggeredTurnIds.includes(state.turn)
  const updatedActive: ActiveLinzhaoState = {
    ...active,
    triggerCount: active.triggerCount + 1,
    triggeredTurnIds: alreadyMarkedThisTurn
      ? active.triggeredTurnIds
      : [...active.triggeredTurnIds, state.turn],
  }

  return appendLog(
    {
      ...state,
      linzhao: state.linzhao.map((candidate) =>
        candidate.id === active.id ? updatedActive : candidate,
      ),
    },
    {
      type: 'LINZHAO_TRIGGERED',
      sourceId: active.id,
      targetId: targetEnemyInstanceId,
      payload: {
        activeLinzhaoId: active.id,
        linzhaoId: active.linzhaoId,
        nameKey: active.nameKey,
        trigger: active.trigger,
        ...payload,
      },
    },
  )
}

function breakEnemyByLinzhao(
  state: CombatState,
  active: ActiveLinzhaoState,
  targetEnemyInstanceId: EnemyInstanceId,
  amount: number,
): CombatState {
  const target = findEnemy(state, targetEnemyInstanceId)

  if (!target || amount <= 0) {
    return state
  }

  const nextCurrentForm = Math.max(0, target.currentForm - amount)
  const brokenAmount = target.currentForm - nextCurrentForm
  const nextState = appendLog(
    {
      ...state,
      enemies: state.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              currentForm: nextCurrentForm,
            }
          : enemy,
      ),
    },
    {
      type: 'FORM_BROKEN',
      sourceId: active.id,
      targetId: target.instanceId,
      payload: {
        amount: brokenAmount,
        currentForm: nextCurrentForm,
        sourceNameKey: active.nameKey,
      },
    },
  )

  return settleVictoryIfNeeded(nextState)
}

function getLinzhaoPlayBlockReasonFromEffect(
  state: CombatState,
  effect: PlaceLinzhaoEffect,
): LinzhaoPlayBlockReason | undefined {
  if (state.linzhao.some((active) => active.linzhaoId === effect.linzhaoId)) {
    return 'linzhao_duplicate'
  }

  if (state.linzhao.length >= MAX_ACTIVE_LINZHAO) {
    return 'linzhao_limit_reached'
  }

  return undefined
}

function getLinzhaoAmountForTarget(active: ActiveLinzhaoState, target: EnemyState | undefined) {
  return target?.isNamed && active.namedAmount !== undefined ? active.namedAmount : active.amount
}

function hasTriggeredThisTurn(active: ActiveLinzhaoState, turn: number) {
  return active.triggeredTurnIds.includes(turn)
}

function findEnemy(state: CombatState, enemyInstanceId?: EnemyInstanceId) {
  if (enemyInstanceId) {
    return state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId)
  }

  return state.enemies.find((enemy) => enemy.currentForm > 0)
}
