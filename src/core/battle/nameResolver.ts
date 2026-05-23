import { appendLog } from '../log/actionLog'
import {
  triggerArtifactsAfterAskName,
  triggerArtifactsAfterEnemyNamed,
} from './artifactBattleResolver'
import { discernEnemyIntent } from './intentInsightResolver'
import { triggerRegisterAfterEnemyNamed } from './registerBattleResolver'
import { triggerThunderLead } from './shapeStatusResolver'
import type { CombatState, EnemyInstanceId, EnemyState, EnemyTier, GameEntityId } from '../../types'

const NAME_BREAK_RATIOS: Readonly<Record<EnemyTier, number>> = {
  minion: 0.33,
  normal: 0.33,
  key_normal: 0.33,
  elite: 0.24,
  boss: 0.2,
}

export interface AskNameInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly amount: number
}

export function resolveAskName(state: CombatState, input: AskNameInput): CombatState {
  const target = selectNameTarget(state.enemies, input.targetEnemyInstanceId)
  const askNamePenalty = Math.min(state.nextAskNamePenalty, input.amount)
  const effectiveAmount = Math.max(0, input.amount - askNamePenalty)
  const stateAfterPenalty =
    askNamePenalty > 0
      ? {
          ...state,
          nextAskNamePenalty: Math.max(0, state.nextAskNamePenalty - input.amount),
        }
      : state

  if (!target) {
    return appendLog(stateAfterPenalty, {
      type: 'NAME_ASKED',
      sourceId: input.sourceId,
      payload: {
        amount: input.amount,
        effectiveAmount,
        askNamePenalty,
        result: 'no_target',
      },
    })
  }

  let nextState = appendLog(stateAfterPenalty, {
    type: 'NAME_ASKED',
    sourceId: input.sourceId,
    targetId: target.instanceId,
    payload: {
      amount: input.amount,
      effectiveAmount,
      askNamePenalty,
      result: target.nameSlots.length === 0 ? 'discern_intent' : 'reveal_name_slot',
    },
  })

  if (effectiveAmount <= 0) {
    return nextState
  }

  if (target.nameSlots.length === 0) {
    nextState = discernEnemyIntent(nextState, {
        sourceId: input.sourceId,
        targetEnemyInstanceId: target.instanceId,
        reason: 'ask_name_fallback',
      })

    nextState = triggerArtifactsAfterAskName(nextState, input.sourceId)
    return triggerThunderLead(nextState, target.instanceId, input.sourceId)
  }

  nextState = triggerArtifactsAfterAskName(nextState, input.sourceId)

  if (target.isNamed) {
    return triggerThunderLead(nextState, target.instanceId, input.sourceId)
  }

  for (let count = 0; count < effectiveAmount; count += 1) {
    const currentTarget = findEnemy(nextState, target.instanceId)
    const nextSlot = currentTarget?.nameSlots.find((slot) => !slot.isRevealed)

    if (!currentTarget || !nextSlot) {
      break
    }

    nextState = revealNameSlot(nextState, currentTarget, nextSlot.index, input.sourceId)
  }

  const updatedTarget = findEnemy(nextState, target.instanceId)

  if (updatedTarget && shouldTriggerNaming(updatedTarget)) {
    nextState = markEnemyNamed(nextState, updatedTarget, input.sourceId)
    nextState = triggerRegisterAfterEnemyNamed(nextState, {
      sourceId: input.sourceId,
      targetId: updatedTarget.instanceId,
    })
    nextState = triggerNameBreak(nextState, updatedTarget.instanceId, input.sourceId)
    nextState = triggerArtifactsAfterEnemyNamed(nextState, input.sourceId)
  }

  return triggerThunderLead(nextState, target.instanceId, input.sourceId)
}

export interface RestoreCoveredNameSlotInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
}

export function restoreCoveredNameSlot(
  state: CombatState,
  input: RestoreCoveredNameSlotInput,
): CombatState {
  const target = selectNameTarget(state.enemies, input.targetEnemyInstanceId)
  const slotIndex = target?.coveredNameSlotIndices[target.coveredNameSlotIndices.length - 1]

  if (!target || slotIndex === undefined) {
    return state
  }

  let nextState = revealNameSlot(state, target, slotIndex, input.sourceId, {
    result: 'restored_by_ink',
  })
  const updatedTarget = findEnemy(nextState, target.instanceId)

  if (updatedTarget && shouldTriggerNaming(updatedTarget)) {
    nextState = markEnemyNamed(nextState, updatedTarget, input.sourceId)
    nextState = triggerRegisterAfterEnemyNamed(nextState, {
      sourceId: input.sourceId,
      targetId: updatedTarget.instanceId,
    })
    nextState = triggerNameBreak(nextState, updatedTarget.instanceId, input.sourceId)
    nextState = triggerThunderLead(nextState, updatedTarget.instanceId, input.sourceId)
    nextState = triggerArtifactsAfterEnemyNamed(nextState, input.sourceId)
  }

  return nextState
}

function revealNameSlot(
  state: CombatState,
  target: EnemyState,
  slotIndex: number,
  sourceId: GameEntityId,
  payload?: Record<string, string>,
): CombatState {
  const enemies = state.enemies.map((enemy) =>
    enemy.instanceId === target.instanceId
      ? {
          ...enemy,
          coveredNameSlotIndices: enemy.coveredNameSlotIndices.filter(
            (coveredSlotIndex) => coveredSlotIndex !== slotIndex,
          ),
          nameSlots: enemy.nameSlots.map((slot) =>
            slot.index === slotIndex
              ? {
                  ...slot,
                  isRevealed: true,
                }
              : slot,
          ),
        }
      : enemy,
  )

  const nextState = {
    ...state,
    enemies,
  }
  const revealedSlot = findEnemy(nextState, target.instanceId)?.nameSlots.find(
    (slot) => slot.index === slotIndex,
  )

  return appendLog(nextState, {
    type: 'NAME_SLOT_REVEALED',
    sourceId,
    targetId: target.instanceId,
    payload: {
      slotIndex,
      nameKey: revealedSlot?.nameKey ?? null,
      ...payload,
    },
  })
}

function markEnemyNamed(
  state: CombatState,
  target: EnemyState,
  sourceId: GameEntityId,
): CombatState {
  const nextState = {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.instanceId === target.instanceId
        ? {
            ...enemy,
            isNamed: true,
          }
        : enemy,
    ),
  }

  return appendLog(nextState, {
    type: 'ENEMY_NAMED',
    sourceId,
    targetId: target.instanceId,
    payload: {
      revealedSlots: target.nameSlots.length,
    },
  })
}

function triggerNameBreak(
  state: CombatState,
  targetEnemyInstanceId: EnemyInstanceId,
  sourceId: GameEntityId,
): CombatState {
  const target = findEnemy(state, targetEnemyInstanceId)

  if (!target || target.hasTriggeredNameBreak) {
    return state
  }

  const ratio = getNameBreakRatio(target)
  const amount = Math.ceil(target.maxForm * ratio)
  const nextCurrentForm = Math.max(0, target.currentForm - amount)
  const brokenAmount = target.currentForm - nextCurrentForm
  const nextState = {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.instanceId === target.instanceId
        ? {
            ...enemy,
            currentForm: nextCurrentForm,
            hasTriggeredNameBreak: true,
          }
        : enemy,
    ),
  }

  return appendLog(nextState, {
    type: 'NAME_BREAK_TRIGGERED',
    sourceId,
    targetId: target.instanceId,
    payload: {
      amount: brokenAmount,
      currentForm: nextCurrentForm,
      ratio,
    },
  })
}

function getNameBreakRatio(enemy: EnemyState) {
  return NAME_BREAK_RATIOS[enemy.tier]
}

function shouldTriggerNaming(enemy: EnemyState): boolean {
  return (
    !enemy.isNamed &&
    enemy.nameSlots.length > 0 &&
    enemy.nameSlots.every((slot) => slot.isRevealed)
  )
}

function selectNameTarget(
  enemies: readonly EnemyState[],
  targetEnemyInstanceId?: EnemyInstanceId,
): EnemyState | undefined {
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

function findEnemy(state: CombatState, enemyInstanceId: EnemyInstanceId): EnemyState | undefined {
  return state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId)
}
