import { appendLog } from '../log/actionLog'
import { triggerArtifactsAfterEnemyNamed } from './artifactBattleResolver'
import type { CombatState, EnemyInstanceId, EnemyState, GameEntityId } from '../../types'

const NORMAL_NAME_BREAK_RATIO = 0.33

export interface AskNameInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly amount: number
}

export function resolveAskName(state: CombatState, input: AskNameInput): CombatState {
  const target = selectNameTarget(state.enemies, input.targetEnemyInstanceId)

  if (!target) {
    return appendLog(state, {
      type: 'NAME_ASKED',
      sourceId: input.sourceId,
      payload: {
        amount: input.amount,
        result: 'no_target',
      },
    })
  }

  let nextState = appendLog(state, {
    type: 'NAME_ASKED',
    sourceId: input.sourceId,
    targetId: target.instanceId,
    payload: {
      amount: input.amount,
      result: target.nameSlots.length === 0 ? 'discern_intent' : 'reveal_name_slot',
    },
  })

  if (target.nameSlots.length === 0 || target.isNamed) {
    return nextState
  }

  for (let count = 0; count < input.amount; count += 1) {
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
    nextState = triggerNameBreak(nextState, updatedTarget.instanceId, input.sourceId)
    nextState = triggerArtifactsAfterEnemyNamed(nextState, input.sourceId)
  }

  return nextState
}

function revealNameSlot(
  state: CombatState,
  target: EnemyState,
  slotIndex: number,
  sourceId: GameEntityId,
): CombatState {
  const enemies = state.enemies.map((enemy) =>
    enemy.instanceId === target.instanceId
      ? {
          ...enemy,
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

  const amount = Math.ceil(target.maxForm * NORMAL_NAME_BREAK_RATIO)
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
      ratio: NORMAL_NAME_BREAK_RATIO,
    },
  })
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
    return enemies.find((enemy) => enemy.instanceId === targetEnemyInstanceId)
  }

  return enemies.find((enemy) => enemy.currentForm > 0)
}

function findEnemy(state: CombatState, enemyInstanceId: EnemyInstanceId): EnemyState | undefined {
  return state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId)
}
