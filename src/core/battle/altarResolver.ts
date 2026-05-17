import { appendLog } from '../log/actionLog'
import { applyTutorialResourceDelta } from '../run/resourceResolver'
import { resolveAskName } from './nameResolver'
import type {
  AbnormalMoveType,
  AltarState,
  CardInstance,
  CombatState,
  EnemyInstanceId,
  EnemyState,
  PlaceAltarEffect,
} from '../../types'

interface PlaceAltarInput {
  readonly card: CardInstance
  readonly effect: PlaceAltarEffect
  readonly targetEnemyInstanceId?: EnemyInstanceId
}

export function placeAltar(state: CombatState, input: PlaceAltarInput): CombatState {
  const targetEnemyInstanceId =
    input.effect.target === 'selected_enemy'
      ? selectLivingEnemy(state, input.targetEnemyInstanceId)?.instanceId
      : undefined
  const altar: AltarState = {
    id: `altar_${input.effect.altarSlot}_${state.actionLog.length + 1}_${input.card.instanceId}`,
    slot: input.effect.altarSlot,
    sourceCardInstanceId: input.card.instanceId,
    sourceCardDefinitionId: input.card.definitionId,
    targetEnemyInstanceId,
    effect: input.effect.altarEffect,
    placedTurn: state.turn,
  }
  const replacedAltars = state.altars.filter((candidate) => candidate.slot === altar.slot)
  let nextState: CombatState = {
    ...state,
    altars: [...state.altars.filter((candidate) => candidate.slot !== altar.slot), altar],
  }

  for (const replacedAltar of replacedAltars) {
    nextState = appendLog(nextState, {
      type: 'ALTAR_EXPIRED',
      sourceId: replacedAltar.id,
      targetId: replacedAltar.targetEnemyInstanceId,
      payload: {
        slot: replacedAltar.slot,
        reason: 'replaced',
      },
    })
  }

  return appendLog(nextState, {
    type: 'ALTAR_PLACED',
    sourceId: altar.id,
    targetId: altar.targetEnemyInstanceId,
    payload: {
      slot: altar.slot,
      sourceCardDefinitionId: altar.sourceCardDefinitionId,
      effectType: altar.effect.type,
    },
  })
}

export function triggerHumanAltars(state: CombatState): CombatState {
  const humanAltars = state.altars.filter((altar) => altar.slot === 'human')

  if (humanAltars.length === 0) {
    return state
  }

  let nextState = state

  for (const altar of humanAltars) {
    const hasNameProgress = hasNameProgressThisTurn(nextState)

    if (hasNameProgress) {
      nextState = gainInkFromAltar(nextState, altar, 'name_progress')
    } else {
      nextState = appendLog(nextState, {
        type: 'ALTAR_TRIGGERED',
        sourceId: altar.id,
        targetId: altar.targetEnemyInstanceId,
        payload: {
          slot: altar.slot,
          effectType: altar.effect.type,
          result: 'skipped',
          reason: 'no_name_progress',
        },
      })
    }

    nextState = expireAltar(nextState, altar, 'triggered')
  }

  return nextState
}

export function triggerEarthAltars(state: CombatState): CombatState {
  const earthAltars = state.altars.filter((altar) => altar.slot === 'earth')

  if (earthAltars.length === 0) {
    return state
  }

  let nextState = state

  for (const altar of earthAltars) {
    const target = selectLivingEnemy(nextState, altar.targetEnemyInstanceId)
    const abnormalMoveType = target ? getCurrentAbnormalMoveType(target) : undefined

    if (target && abnormalMoveType) {
      nextState = prepareAbnormalCounter(nextState, altar, target, abnormalMoveType)
    } else {
      nextState = gainInkFromAltar(nextState, altar, 'no_abnormal_move')
    }

    nextState = expireAltar(nextState, altar, 'triggered')
  }

  return nextState
}

export function triggerHeavenAltars(state: CombatState): CombatState {
  const heavenAltars = state.altars.filter(
    (altar) => altar.slot === 'heaven' && altar.placedTurn < state.turn,
  )

  if (heavenAltars.length === 0) {
    return state
  }

  let nextState = state

  for (const altar of heavenAltars) {
    const target = selectLivingEnemy(nextState, altar.targetEnemyInstanceId)

    if (!target) {
      nextState = appendLog(nextState, {
        type: 'ALTAR_TRIGGERED',
        sourceId: altar.id,
        payload: {
          slot: altar.slot,
          effectType: altar.effect.type,
          result: 'skipped',
          reason: 'no_target',
        },
      })
      nextState = expireAltar(nextState, altar, 'triggered')
      continue
    }

    nextState = appendLog(nextState, {
      type: 'ALTAR_TRIGGERED',
      sourceId: altar.id,
      targetId: target.instanceId,
      payload: {
        slot: altar.slot,
        effectType: altar.effect.type,
        result: 'ask_name',
        amount: getAltarAmount(altar),
      },
    })
    nextState = resolveAskName(nextState, {
      sourceId: altar.id,
      targetEnemyInstanceId: target.instanceId,
      amount: getAltarAmount(altar),
    })
    nextState = gainInkFromAltar(nextState, altar, 'heaven_altar')
    nextState = expireAltar(nextState, altar, 'triggered')
  }

  return nextState
}

function prepareAbnormalCounter(
  state: CombatState,
  altar: AltarState,
  target: EnemyState,
  moveType: AbnormalMoveType,
): CombatState {
  const counterMoveType = altar.effect.moveType ?? moveType
  const nextBlockedMoveTypes = target.blockedAbnormalMoveTypes.includes(counterMoveType)
    ? target.blockedAbnormalMoveTypes
    : [...target.blockedAbnormalMoveTypes, counterMoveType]
  let nextState: CombatState = {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.instanceId === target.instanceId
        ? {
            ...enemy,
            blockedAbnormalMoveTypes: nextBlockedMoveTypes,
          }
        : enemy,
    ),
  }

  nextState = appendLog(nextState, {
    type: 'ALTAR_TRIGGERED',
    sourceId: altar.id,
    targetId: target.instanceId,
    payload: {
      slot: altar.slot,
      effectType: altar.effect.type,
      result: 'counter_abnormal',
      moveType: counterMoveType,
    },
  })

  return appendLog(nextState, {
    type: 'ABNORMAL_MOVE_COUNTERED',
    sourceId: altar.id,
    targetId: target.instanceId,
    payload: {
      moveType: counterMoveType,
      result: 'prepared',
    },
  })
}

function gainInkFromAltar(
  state: CombatState,
  altar: AltarState,
  reason: string,
): CombatState {
  const amount = getAltarAmount(altar)
  const resources = applyTutorialResourceDelta(state.resources, {
    ink: amount,
  })
  let nextState: CombatState = {
    ...state,
    resources,
  }

  nextState = appendLog(nextState, {
    type: 'ALTAR_TRIGGERED',
    sourceId: altar.id,
    targetId: altar.targetEnemyInstanceId,
    payload: {
      slot: altar.slot,
      effectType: altar.effect.type,
      result: 'gain_ink',
      reason,
      amount,
      currentInk: resources.ink,
    },
  })

  return appendLog(nextState, {
    type: 'INK_GAINED',
    sourceId: altar.id,
    targetId: 'player',
    payload: {
      amount,
      currentInk: resources.ink,
    },
  })
}

function expireAltar(state: CombatState, altar: AltarState, reason: string): CombatState {
  const nextState: CombatState = {
    ...state,
    altars: state.altars.filter((candidate) => candidate.id !== altar.id),
  }

  return appendLog(nextState, {
    type: 'ALTAR_EXPIRED',
    sourceId: altar.id,
    targetId: altar.targetEnemyInstanceId,
    payload: {
      slot: altar.slot,
      reason,
    },
  })
}

function hasNameProgressThisTurn(state: CombatState) {
  return state.actionLog.some((entry) => {
    if (entry.turn !== state.turn) {
      return false
    }

    if (entry.type === 'CARD_ANNOTATION_TRIGGERED') {
      return true
    }

    if (entry.type === 'ENEMY_NAMED') {
      return true
    }

    return entry.type === 'NAME_ASKED' && entry.payload.result !== 'no_target'
  })
}

function selectLivingEnemy(
  state: CombatState,
  enemyInstanceId?: EnemyInstanceId,
): EnemyState | undefined {
  if (enemyInstanceId) {
    return state.enemies.find(
      (enemy) => enemy.instanceId === enemyInstanceId && enemy.currentForm > 0,
    )
  }

  return state.enemies.find((enemy) => enemy.currentForm > 0)
}

function getCurrentAbnormalMoveType(enemy: EnemyState): AbnormalMoveType | undefined {
  return enemy.currentIntent?.effects.find((effect) => effect.type === 'ABNORMAL_MOVE')?.move.type
}

function getAltarAmount(altar: AltarState) {
  return altar.effect.amount ?? 1
}
