import { appendLog } from '../log/actionLog'
import { drawCards } from './turnFlow'
import { resolveAskName } from './nameResolver'
import type {
  CardDefinition,
  CardEffect,
  CardInstance,
  CombatState,
  CounterAbnormalMoveEffect,
  EnemyInstanceId,
  EnemyState,
  SealMomentumEffect,
} from '../../types'

export interface ResolveCardInput {
  readonly cardInstanceId: string
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly cardDefinitions: readonly CardDefinition[]
}

export function resolvePlayCard(state: CombatState, input: ResolveCardInput): CombatState {
  if (state.phase !== 'player_turn' || state.result.status !== 'ongoing') {
    return state
  }

  const card = state.hand.find((candidate) => candidate.instanceId === input.cardInstanceId)

  if (!card) {
    return appendLog(state, {
      type: 'CARD_PLAY_REJECTED',
      sourceId: 'player',
      payload: {
        reason: 'card_not_in_hand',
        cardInstanceId: input.cardInstanceId,
      },
    })
  }

  const cardDefinition = input.cardDefinitions.find(
    (candidate) => candidate.id === card.definitionId,
  )

  if (!cardDefinition) {
    throw new Error(`Missing card definition: ${card.definitionId}`)
  }

  if (state.player.incense < cardDefinition.cost) {
    return appendLog(state, {
      type: 'CARD_PLAY_REJECTED',
      sourceId: card.instanceId,
      payload: {
        reason: 'not_enough_incense',
        requiredIncense: cardDefinition.cost,
        currentIncense: state.player.incense,
      },
    })
  }

  let nextState: CombatState = {
    ...state,
    player: {
      ...state.player,
      incense: state.player.incense - cardDefinition.cost,
    },
  }

  nextState = appendLog(nextState, {
    type: 'INCENSE_SPENT',
    sourceId: card.instanceId,
    payload: {
      amount: cardDefinition.cost,
      currentIncense: nextState.player.incense,
    },
  })

  nextState = appendLog(nextState, {
    type: 'CARD_PLAYED',
    sourceId: card.instanceId,
    targetId: input.targetEnemyInstanceId,
    payload: {
      cardDefinitionId: cardDefinition.id,
      cost: cardDefinition.cost,
    },
  })

  nextState = removeCardFromHand(nextState, card.instanceId)
  nextState = resolveCardEffects(nextState, card, cardDefinition, input.targetEnemyInstanceId)
  nextState = movePlayedCard(nextState, card, cardDefinition)

  return settleVictoryIfNeeded(nextState)
}

function resolveCardEffects(
  state: CombatState,
  card: CardInstance,
  cardDefinition: CardDefinition,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  let nextState = state

  for (const effect of cardDefinition.effects) {
    if (!isEffectConditionMet(nextState, effect, targetEnemyInstanceId)) {
      continue
    }

    nextState = resolveCardEffect(nextState, card, effect, targetEnemyInstanceId)
  }

  return nextState
}

function resolveCardEffect(
  state: CombatState,
  card: CardInstance,
  effect: CardEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  if (effect.type === 'BREAK_SHAPE') {
    return breakEnemyForm(state, card, effect.amount, targetEnemyInstanceId)
  }

  if (effect.type === 'DRAW') {
    return drawCards(state, effect.count)
  }

  if (effect.type === 'GAIN_INCENSE') {
    const nextState = {
      ...state,
      player: {
        ...state.player,
        incense: state.player.incense + effect.amount,
      },
    }

    return appendLog(nextState, {
      type: 'INCENSE_GAINED',
      sourceId: card.instanceId,
      targetId: 'player',
      payload: {
        amount: effect.amount,
        currentIncense: nextState.player.incense,
      },
    })
  }

  if (effect.type === 'SEAL_MOMENTUM') {
    return sealIncomingForce(state, card, effect, targetEnemyInstanceId)
  }

  if (effect.type === 'COUNTER_ABNORMAL_MOVE') {
    return counterAbnormalMove(state, card, effect, targetEnemyInstanceId)
  }

  return resolveAskName(state, {
    sourceId: card.instanceId,
    targetEnemyInstanceId,
    amount: effect.amount,
  })
}

function sealIncomingForce(
  state: CombatState,
  card: CardInstance,
  effect: SealMomentumEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, targetEnemyInstanceId, effect.target)
  let nextState = state

  for (const target of targets) {
    const nextIncomingForce = Math.max(0, target.incomingForce - effect.amount)
    const sealedAmount = target.incomingForce - nextIncomingForce

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              incomingForce: nextIncomingForce,
            }
          : enemy,
      ),
    }

    nextState = appendLog(nextState, {
      type: 'INCOMING_FORCE_SEALED',
      sourceId: card.instanceId,
      targetId: target.instanceId,
      payload: {
        requestedAmount: effect.amount,
        amount: sealedAmount,
        remainingIncomingForce: nextIncomingForce,
      },
    })
  }

  return nextState
}

function counterAbnormalMove(
  state: CombatState,
  card: CardInstance,
  effect: CounterAbnormalMoveEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, targetEnemyInstanceId, effect.target)
  let nextState = state

  for (const target of targets) {
    const nextBlockedMoveTypes = target.blockedAbnormalMoveTypes.includes(effect.moveType ?? 'custom')
      ? target.blockedAbnormalMoveTypes
      : [...target.blockedAbnormalMoveTypes, effect.moveType ?? 'custom']

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              blockedAbnormalMoveTypes: nextBlockedMoveTypes,
            }
          : enemy,
      ),
    }

    nextState = appendLog(nextState, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: card.instanceId,
      targetId: target.instanceId,
      payload: {
        moveType: effect.moveType ?? 'custom',
        result: 'prepared',
      },
    })
  }

  return nextState
}

function breakEnemyForm(
  state: CombatState,
  card: CardInstance,
  amount: number,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, targetEnemyInstanceId)
  let nextState = state

  for (const target of targets) {
    const nextCurrentForm = Math.max(0, target.currentForm - amount)
    const brokenAmount = target.currentForm - nextCurrentForm

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              currentForm: nextCurrentForm,
            }
          : enemy,
      ),
    }

    nextState = appendLog(nextState, {
      type: 'FORM_BROKEN',
      sourceId: card.instanceId,
      targetId: target.instanceId,
      payload: {
        amount: brokenAmount,
        currentForm: nextCurrentForm,
      },
    })
  }

  return nextState
}

function selectEnemyTargets(
  enemies: readonly EnemyState[],
  targetEnemyInstanceId?: EnemyInstanceId,
  targetType: 'selected_enemy' | 'all_enemies' | 'random_enemy' = 'selected_enemy',
): readonly EnemyState[] {
  if (targetType === 'all_enemies') {
    return enemies.filter((enemy) => enemy.currentForm > 0)
  }

  if (targetEnemyInstanceId) {
    return enemies.filter((enemy) => enemy.instanceId === targetEnemyInstanceId)
  }

  const firstLivingEnemy = enemies.find((enemy) => enemy.currentForm > 0)
  return firstLivingEnemy ? [firstLivingEnemy] : []
}

function isEffectConditionMet(
  state: CombatState,
  effect: CardEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
) {
  if (!effect.condition) {
    return true
  }

  const target = selectEnemyTargets(state.enemies, targetEnemyInstanceId)[0]

  if (effect.condition.type === 'TARGET_HAS_REVEALED_NAME_SLOT') {
    return Boolean(target?.nameSlots.some((slot) => slot.isRevealed))
  }

  if (effect.condition.type === 'TARGET_HAS_NO_NAME_SLOT') {
    return Boolean(target && target.nameSlots.length === 0)
  }

  return state.actionLog.some(
    (entry) => entry.turn === state.turn && entry.type === 'ENEMY_NAMED',
  )
}

function removeCardFromHand(state: CombatState, cardInstanceId: string): CombatState {
  return {
    ...state,
    hand: state.hand.filter((card) => card.instanceId !== cardInstanceId),
  }
}

function movePlayedCard(
  state: CombatState,
  card: CardInstance,
  cardDefinition: CardDefinition,
): CombatState {
  const shouldExhaust =
    card.isTemporary || cardDefinition.type === 'temporary' || cardDefinition.tags.includes('exhaust')
  const nextState = shouldExhaust
    ? {
        ...state,
        exhaustPile: [...state.exhaustPile, card],
      }
    : {
        ...state,
        discardPile: [...state.discardPile, card],
      }

  return appendLog(nextState, {
    type: shouldExhaust ? 'CARD_EXHAUSTED' : 'CARD_DISCARDED',
    sourceId: card.instanceId,
    payload: {
      cardDefinitionId: card.definitionId,
    },
  })
}

function settleVictoryIfNeeded(state: CombatState): CombatState {
  const defeatedEnemy = state.enemies.find((enemy) => enemy.currentForm <= 0)

  if (!defeatedEnemy || state.result.status !== 'ongoing') {
    return state
  }

  const settlement = defeatedEnemy.isNamed ? 'catalogue' : 'vanquish'
  const nextState: CombatState = {
    ...state,
    phase: 'victory',
    result: {
      status: 'victory',
      settlement,
      enemyInstanceId: defeatedEnemy.instanceId,
    },
  }

  return appendLog(nextState, {
    type: 'VICTORY_SETTLED',
    sourceId: defeatedEnemy.instanceId,
    payload: {
      settlement,
    },
  })
}
