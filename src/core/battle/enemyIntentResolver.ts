import { appendLog } from '../log/actionLog'
import type { CombatState, EnemyDefinition, EnemyState } from '../../types'

export function executeEnemyTurn(
  state: CombatState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  let nextState: CombatState = {
    ...state,
    phase: 'enemy_turn',
  }

  for (const enemy of nextState.enemies) {
    if (enemy.currentForm <= 0) {
      continue
    }

    nextState = executeEnemyIntent(nextState, enemy, enemyDefinitions)
  }

  return nextState
}

function executeEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  if (!enemy.currentIntent) {
    return state
  }

  let nextState = state

  for (const effect of enemy.currentIntent.effects) {
    if (effect.type === 'INCOMING_FORCE') {
      nextState = appendLog(nextState, {
        type: 'INCOMING_FORCE_CREATED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          intentId: enemy.currentIntent.id,
          amount: effect.amount,
        },
      })
    }

    if (effect.type === 'ABNORMAL_MOVE') {
      nextState = appendLog(nextState, {
        type: 'ABNORMAL_MOVE_EXECUTED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          intentId: enemy.currentIntent.id,
          moveType: effect.move.type,
          amount: effect.move.amount ?? null,
        },
      })
    }
  }

  return advanceEnemyIntent(nextState, enemy, enemyDefinitions)
}

function advanceEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  const definition = enemyDefinitions.find((candidate) => candidate.id === enemy.definitionId)

  if (!definition || definition.intents.length === 0) {
    return state
  }

  const nextIntentIndex = (enemy.intentIndex + 1) % definition.intents.length
  const enemies = state.enemies.map((candidate) =>
    candidate.instanceId === enemy.instanceId
      ? {
          ...candidate,
          intentIndex: nextIntentIndex,
          currentIntent: definition.intents[nextIntentIndex],
        }
      : candidate,
  )

  return {
    ...state,
    enemies,
  }
}
