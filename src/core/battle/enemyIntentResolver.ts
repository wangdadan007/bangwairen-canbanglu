import { appendLog } from '../log/actionLog'
import type {
  AbnormalMoveDefinition,
  CombatState,
  EnemyDefinition,
  EnemyIntentDefinition,
  EnemyState,
} from '../../types'

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
      const amount = enemy.incomingForce
      nextState = appendLog(nextState, {
        type: 'INCOMING_FORCE_CREATED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          intentId: enemy.currentIntent.id,
          amount,
          baseAmount: effect.amount,
        },
      })
    }

    if (effect.type === 'ABNORMAL_MOVE') {
      nextState = executeAbnormalMove(nextState, enemy, enemy.currentIntent.id, effect.move)
    }
  }

  return advanceEnemyIntent(nextState, enemy, enemyDefinitions)
}

function executeAbnormalMove(
  state: CombatState,
  enemy: EnemyState,
  intentId: string,
  move: AbnormalMoveDefinition,
): CombatState {
  if (enemy.blockedAbnormalMoveTypes.includes(move.type)) {
    return appendLog(state, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: enemy.instanceId,
      targetId: 'player',
      payload: {
        intentId,
        moveType: move.type,
        result: 'prevented',
      },
    })
  }

  let nextState = state

  if (move.type === 'steal_incense') {
    nextState = {
      ...nextState,
      nextTurnIncensePenalty: nextState.nextTurnIncensePenalty + (move.amount ?? 1),
    }
  }

  return appendLog(nextState, {
    type: 'ABNORMAL_MOVE_EXECUTED',
    sourceId: enemy.instanceId,
    targetId: 'player',
    payload: {
      intentId,
      moveType: move.type,
      amount: move.amount ?? null,
      nextTurnIncensePenalty: nextState.nextTurnIncensePenalty,
    },
  })
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
  const nextIntent = definition.intents[nextIntentIndex]
  const enemies = state.enemies.map((candidate) =>
    candidate.instanceId === enemy.instanceId
      ? {
          ...candidate,
          intentIndex: nextIntentIndex,
          currentIntent: nextIntent,
          incomingForce: getIncomingForce(nextIntent),
          blockedAbnormalMoveTypes: [],
        }
      : candidate,
  )

  return {
    ...state,
    enemies,
  }
}

function getIncomingForce(intent: EnemyIntentDefinition | undefined): number {
  if (!intent) {
    return 0
  }

  return intent.effects.reduce(
    (total, effect) => total + (effect.type === 'INCOMING_FORCE' ? effect.amount : 0),
    0,
  )
}
