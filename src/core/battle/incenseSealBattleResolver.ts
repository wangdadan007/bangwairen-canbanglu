import { appendLog } from '../log/actionLog'
import { removeIncenseSealFromState } from '../run/incenseSealResolver'
import { drawCards } from './drawResolver'
import { triggerLinzhaoAfterAbnormalMovePrevented, triggerLinzhaoAfterIncomingForceSealed } from './linzhaoResolver'
import { breakEnemyForm } from './shapeResolver'
import { settleVictoryIfNeeded } from './victoryResolver'
import type {
  CombatState,
  EnemyInstanceId,
  IncenseSealDefinition,
  IncenseSealInstanceId,
} from '../../types'

const FOULED_SCROLL_CARD_ID = 'card_fouled_scroll'

export interface ResolveIncenseSealUseInput {
  readonly incenseSealInstanceId: IncenseSealInstanceId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly incenseSealDefinitions: readonly IncenseSealDefinition[]
}

export function resolveIncenseSealUse(
  state: CombatState,
  input: ResolveIncenseSealUseInput,
): CombatState {
  if (state.phase !== 'player_turn' || state.result.status !== 'ongoing') {
    return state
  }

  const seal = state.incenseSeals.seals.find(
    (candidate) => candidate.id === input.incenseSealInstanceId,
  )

  if (!seal) {
    return appendIncenseSealRejectedLog(state, input.incenseSealInstanceId, 'seal_not_available')
  }

  const definition = input.incenseSealDefinitions.find(
    (candidate) => candidate.id === seal.definitionId,
  )

  if (!definition) {
    throw new Error(`Missing incense seal definition: ${seal.definitionId}`)
  }

  const target = input.targetEnemyInstanceId
    ? state.enemies.find(
        (enemy) => enemy.instanceId === input.targetEnemyInstanceId && enemy.currentForm > 0,
      )
    : undefined

  if (definition.targetMode === 'selected_enemy' && !target) {
    return appendIncenseSealRejectedLog(state, seal.id, 'target_required', definition.id)
  }

  let nextState = {
    ...state,
    incenseSeals: removeIncenseSealFromState(state.incenseSeals, seal.id),
  }

  if (definition.effectType === 'guard_name') {
    const revealResult = target ? revealCoveredNameSlot(nextState, target.instanceId) : undefined

    nextState = revealResult?.state ?? {
      ...nextState,
      nameGuardCharges: nextState.nameGuardCharges + 1,
    }

    return appendIncenseSealUsedLog(nextState, seal.id, definition.id, target?.instanceId, {
      result: revealResult?.revealedSlotIndex === undefined ? 'prepared_guard' : 'revealed_covered_name',
      revealedSlotIndex: revealResult?.revealedSlotIndex ?? null,
      nameGuardCharges: nextState.nameGuardCharges,
    })
  }

  if (definition.effectType === 'cleanse_fouled_scroll') {
    const cleanseResult = cleanseFouledScrolls(nextState, Math.max(1, definition.amount ?? 1))
    nextState = cleanseResult.state

    return appendIncenseSealUsedLog(nextState, seal.id, definition.id, undefined, {
      result: cleanseResult.removedCount > 0 ? 'cleansed' : 'no_fouled_scroll',
      removedCount: cleanseResult.removedCount,
    })
  }

  if (definition.effectType === 'suppress_incoming_force' && target) {
    const amount = Math.max(0, definition.amount ?? 0)
    const nextIncomingForce = Math.max(0, target.incomingForce - amount)
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
      sourceId: seal.id,
      targetId: target.instanceId,
      payload: {
        requestedAmount: amount,
        amount: sealedAmount,
        remainingIncomingForce: nextIncomingForce,
        source: 'incense_seal',
        sealDefinitionId: definition.id,
      },
    })
    nextState = triggerLinzhaoAfterIncomingForceSealed(nextState, {
      targetEnemyInstanceId: target.instanceId,
      sealedAmount,
      remainingIncomingForce: nextIncomingForce,
    })

    return appendIncenseSealUsedLog(nextState, seal.id, definition.id, target.instanceId, {
      result: sealedAmount > 0 ? 'suppressed' : 'no_incoming_force',
      amount: sealedAmount,
    })
  }

  if (definition.effectType === 'counter_abnormal_move' && target) {
    const abnormalMove = target.currentIntent?.effects.find(
      (effect) => effect.type === 'ABNORMAL_MOVE',
    )
    const moveType = abnormalMove?.type === 'ABNORMAL_MOVE' ? abnormalMove.move.type : undefined

    if (!moveType) {
      return appendIncenseSealUsedLog(nextState, seal.id, definition.id, target.instanceId, {
        result: 'no_abnormal_move',
      })
    }

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              blockedAbnormalMoveTypes: enemy.blockedAbnormalMoveTypes.includes(moveType)
                ? enemy.blockedAbnormalMoveTypes
                : [...enemy.blockedAbnormalMoveTypes, moveType],
            }
          : enemy,
      ),
    }
    nextState = appendLog(nextState, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: seal.id,
      targetId: target.instanceId,
      payload: {
        moveType,
        result: 'prepared',
        source: 'incense_seal',
        sealDefinitionId: definition.id,
      },
    })
    nextState = triggerLinzhaoAfterAbnormalMovePrevented(nextState, {
      enemyInstanceId: target.instanceId,
    })

    return appendIncenseSealUsedLog(nextState, seal.id, definition.id, target.instanceId, {
      result: 'prepared_counter',
      moveType,
    })
  }

  if (definition.effectType === 'gain_incense_draw') {
    const amount = Math.max(0, definition.amount ?? 0)
    nextState = {
      ...nextState,
      player: {
        ...nextState.player,
        incense: nextState.player.incense + amount,
      },
    }
    nextState = appendLog(nextState, {
      type: 'INCENSE_GAINED',
      sourceId: seal.id,
      targetId: 'player',
      payload: {
        amount,
        currentIncense: nextState.player.incense,
        source: 'incense_seal',
        sealDefinitionId: definition.id,
      },
    })
    nextState = drawCards(nextState, Math.max(0, definition.drawCount ?? 0))

    return appendIncenseSealUsedLog(nextState, seal.id, definition.id, undefined, {
      result: 'gained_incense_draw',
      amount,
      drawCount: definition.drawCount ?? 0,
    })
  }

  if (definition.effectType === 'break_shape' && target) {
    const amount = target.isNamed ? (definition.namedAmount ?? definition.amount ?? 0) : (definition.amount ?? 0)
    nextState = breakEnemyForm(nextState, {
      sourceId: seal.id,
      targetEnemyInstanceId: target.instanceId,
      amount,
      targetType: 'selected_enemy',
    })
    nextState = settleVictoryIfNeeded(nextState)

    return appendIncenseSealUsedLog(nextState, seal.id, definition.id, target.instanceId, {
      result: 'broke_shape',
      amount,
    })
  }

  return appendIncenseSealUsedLog(nextState, seal.id, definition.id, target?.instanceId, {
    result: 'no_effect',
  })
}

export function consumeNameGuardForCoverName(state: CombatState, enemyInstanceId: string): CombatState | undefined {
  if (state.nameGuardCharges <= 0) {
    return undefined
  }

  return appendLog(
    {
      ...state,
      nameGuardCharges: Math.max(0, state.nameGuardCharges - 1),
    },
    {
      type: 'INCENSE_SEAL_USED',
      sourceId: 'seal_guard_name',
      targetId: enemyInstanceId,
      payload: {
        sealDefinitionId: 'seal_guard_name',
        result: 'prevented_cover_name',
        nameGuardCharges: Math.max(0, state.nameGuardCharges - 1),
      },
    },
  )
}

function appendIncenseSealRejectedLog(
  state: CombatState,
  sealInstanceId: string,
  reason: string,
  sealDefinitionId?: string,
): CombatState {
  return appendLog(state, {
    type: 'INCENSE_SEAL_REJECTED',
    sourceId: sealInstanceId,
    payload: {
      reason,
      sealDefinitionId: sealDefinitionId ?? null,
    },
  })
}

function appendIncenseSealUsedLog(
  state: CombatState,
  sealInstanceId: string,
  sealDefinitionId: string,
  targetId: string | undefined,
  payload: Record<string, string | number | boolean | null>,
): CombatState {
  return appendLog(state, {
    type: 'INCENSE_SEAL_USED',
    sourceId: sealInstanceId,
    targetId,
    payload: {
      sealDefinitionId,
      ...payload,
    },
  })
}

function revealCoveredNameSlot(state: CombatState, enemyInstanceId: string) {
  const target = state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId)
  const coveredSlotIndex = target?.coveredNameSlotIndices[0]

  if (!target || coveredSlotIndex === undefined) {
    return undefined
  }

  return {
    state: {
      ...state,
      enemies: state.enemies.map((enemy) =>
        enemy.instanceId === enemyInstanceId
          ? {
              ...enemy,
              coveredNameSlotIndices: enemy.coveredNameSlotIndices.filter(
                (slotIndex) => slotIndex !== coveredSlotIndex,
              ),
              nameSlots: enemy.nameSlots.map((slot) =>
                slot.index === coveredSlotIndex
                  ? {
                      ...slot,
                      isRevealed: true,
                    }
                  : slot,
              ),
            }
          : enemy,
      ),
    },
    revealedSlotIndex: coveredSlotIndex,
  }
}

function cleanseFouledScrolls(state: CombatState, maxCount: number) {
  let remaining = maxCount
  const nextDrawPile = state.drawPile.filter((card) => {
    if (remaining > 0 && card.definitionId === FOULED_SCROLL_CARD_ID) {
      remaining -= 1
      return false
    }

    return true
  })
  const nextDiscardPile = state.discardPile.filter((card) => {
    if (remaining > 0 && card.definitionId === FOULED_SCROLL_CARD_ID) {
      remaining -= 1
      return false
    }

    return true
  })

  return {
    state: {
      ...state,
      drawPile: nextDrawPile,
      discardPile: nextDiscardPile,
    },
    removedCount: maxCount - remaining,
  }
}
