import { appendLog } from '../log/actionLog'
import { applyTutorialResourceDelta } from '../run/resourceResolver'
import { restoreCoveredNameSlot } from './nameResolver'
import type {
  AbnormalMoveType,
  CardInstance,
  CombatState,
  EnemyInstanceId,
  EnemyState,
} from '../../types'

export const INK_ACTION_COST = 1
export const FOUL_OR_ASH_CARD_IDS = ['card_fouled_scroll', 'card_doom_ash'] as const

export type SpendInkGuardNameMode = 'restore_covered_name' | 'prepare_cover_name_guard'

export interface InkActionStatus {
  readonly canUse: boolean
  readonly reason?: string
  readonly mode?: SpendInkGuardNameMode
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly cardInstanceId?: string
  readonly cardDefinitionId?: string
}

export function getSpendInkGuardNameStatus(
  state: CombatState,
  targetEnemyInstanceId?: EnemyInstanceId,
): InkActionStatus {
  if (state.phase !== 'player_turn' || state.result.status !== 'ongoing') {
    return {
      canUse: false,
      reason: '只能在己方回合留墨护名。',
    }
  }

  if (state.resources.ink < INK_ACTION_COST) {
    return {
      canUse: false,
      reason: '墨不足，需 1 墨。',
    }
  }

  const target = selectEnemyTarget(state.enemies, targetEnemyInstanceId)

  if (!target) {
    return {
      canUse: false,
      reason: '没有可护名的目标。',
    }
  }

  if (target.coveredNameSlotIndices.length > 0) {
    return {
      canUse: true,
      mode: 'restore_covered_name',
      targetEnemyInstanceId: target.instanceId,
    }
  }

  if (
    target.nameSlots.some((slot) => slot.isRevealed) &&
    hasIncomingCoverNameMove(target) &&
    !target.blockedAbnormalMoveTypes.includes('cover_name')
  ) {
    return {
      canUse: true,
      mode: 'prepare_cover_name_guard',
      targetEnemyInstanceId: target.instanceId,
    }
  }

  return {
    canUse: false,
    reason: '当前没有被遮名迹，也没有即将遮名的异动。',
  }
}

export function spendInkGuardName(
  state: CombatState,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  const status = getSpendInkGuardNameStatus(state, targetEnemyInstanceId)

  if (!status.canUse || !status.mode || !status.targetEnemyInstanceId) {
    return appendLog(state, {
      type: 'INK_ACTION_REJECTED',
      sourceId: 'player',
      targetId: targetEnemyInstanceId,
      payload: {
        action: 'guard_name',
        reason: status.reason ?? 'unavailable',
      },
    })
  }

  let nextState = spendInk(state, {
    action: 'guard_name',
    result: status.mode,
    targetEnemyInstanceId: status.targetEnemyInstanceId,
  })

  if (status.mode === 'restore_covered_name') {
    return restoreCoveredNameSlot(nextState, {
      sourceId: 'player',
      targetEnemyInstanceId: status.targetEnemyInstanceId,
    })
  }

  nextState = {
    ...nextState,
    enemies: nextState.enemies.map((enemy) =>
      enemy.instanceId === status.targetEnemyInstanceId
        ? {
            ...enemy,
            blockedAbnormalMoveTypes: appendBlockedMove(enemy.blockedAbnormalMoveTypes, 'cover_name'),
          }
        : enemy,
    ),
  }

  return appendLog(nextState, {
    type: 'ABNORMAL_MOVE_COUNTERED',
    sourceId: 'player',
    targetId: status.targetEnemyInstanceId,
    payload: {
      moveType: 'cover_name',
      result: 'prepared_by_ink',
    },
  })
}

export function getSpendInkCleanseStatus(state: CombatState): InkActionStatus {
  if (state.phase !== 'player_turn' || state.result.status !== 'ongoing') {
    return {
      canUse: false,
      reason: '只能在己方回合净卷。',
    }
  }

  if (state.resources.ink < INK_ACTION_COST) {
    return {
      canUse: false,
      reason: '墨不足，需 1 墨。',
    }
  }

  const target = findFirstFoulOrAshCard(state)

  if (!target) {
    return {
      canUse: false,
      reason: '当前没有污卷或劫灰可净。',
    }
  }

  return {
    canUse: true,
    cardInstanceId: target.card.instanceId,
    cardDefinitionId: target.card.definitionId,
  }
}

export function spendInkCleanse(state: CombatState): CombatState {
  const status = getSpendInkCleanseStatus(state)

  if (!status.canUse || !status.cardInstanceId || !status.cardDefinitionId) {
    return appendLog(state, {
      type: 'INK_ACTION_REJECTED',
      sourceId: 'player',
      payload: {
        action: 'cleanse_card',
        reason: status.reason ?? 'unavailable',
      },
    })
  }

  const target = findFirstFoulOrAshCard(state)

  if (!target) {
    return state
  }

  const withoutCard = removeCardFromZone(state, target.zone, target.card.instanceId)
  const nextState = spendInk(withoutCard, {
    action: 'cleanse_card',
    result: 'cleansed',
    cardInstanceId: target.card.instanceId,
    cardDefinitionId: target.card.definitionId,
    zone: target.zone,
  })

  return {
    ...nextState,
    exhaustPile: [...nextState.exhaustPile, target.card],
  }
}

function spendInk(
  state: CombatState,
  payload: {
    readonly action: 'guard_name' | 'cleanse_card'
    readonly result: string
    readonly targetEnemyInstanceId?: EnemyInstanceId
    readonly cardInstanceId?: string
    readonly cardDefinitionId?: string
    readonly zone?: string
  },
) {
  const nextResources = applyTutorialResourceDelta(state.resources, {
    ink: -INK_ACTION_COST,
  })
  const nextState: CombatState = {
    ...state,
    resources: nextResources,
  }

  return appendLog(nextState, {
    type: 'INK_SPENT',
    sourceId: 'player',
    targetId: payload.targetEnemyInstanceId ?? payload.cardInstanceId,
    payload: {
      amount: INK_ACTION_COST,
      currentInk: nextResources.ink,
      ...payload,
    },
  })
}

function selectEnemyTarget(
  enemies: readonly EnemyState[],
  targetEnemyInstanceId?: EnemyInstanceId,
) {
  if (targetEnemyInstanceId) {
    const selectedEnemy = enemies.find(
      (enemy) => enemy.instanceId === targetEnemyInstanceId && enemy.currentForm > 0,
    )

    if (selectedEnemy) {
      return selectedEnemy
    }
  }

  return enemies.find((enemy) => enemy.currentForm > 0)
}

function hasIncomingCoverNameMove(enemy: EnemyState) {
  return enemy.currentIntent?.effects.some(
    (effect) => effect.type === 'ABNORMAL_MOVE' && effect.move.type === 'cover_name',
  )
}

function appendBlockedMove(
  moves: readonly AbnormalMoveType[],
  moveType: AbnormalMoveType,
) {
  return moves.includes(moveType) ? moves : [...moves, moveType]
}

function findFirstFoulOrAshCard(state: CombatState):
  | {
      readonly card: CardInstance
      readonly zone: 'hand' | 'drawPile' | 'discardPile'
    }
  | undefined {
  for (const zone of ['hand', 'drawPile', 'discardPile'] as const) {
    const card = state[zone].find((candidate) =>
      FOUL_OR_ASH_CARD_IDS.includes(candidate.definitionId as (typeof FOUL_OR_ASH_CARD_IDS)[number]),
    )

    if (card) {
      return {
        card,
        zone,
      }
    }
  }

  return undefined
}

function removeCardFromZone(
  state: CombatState,
  zone: 'hand' | 'drawPile' | 'discardPile',
  cardInstanceId: string,
): CombatState {
  return {
    ...state,
    [zone]: state[zone].filter((card) => card.instanceId !== cardInstanceId),
  }
}
