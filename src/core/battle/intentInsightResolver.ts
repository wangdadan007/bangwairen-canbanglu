import { appendLog } from '../log/actionLog'
import type {
  CombatState,
  EnemyInstanceId,
  EnemyIntentDefinition,
  GameEntityId,
} from '../../types'

export type IntentDiscernResult =
  | 'current_revealed'
  | 'next_previewed'
  | 'no_target'
  | 'no_intent'

export interface IntentDiscernment {
  readonly state: CombatState
  readonly result: IntentDiscernResult
  readonly intent?: EnemyIntentDefinition
  readonly previewTurnOffset?: 0 | 1
}

export interface DiscernEnemyIntentInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly reason: 'ask_name_fallback' | 'artifact' | 'manual'
}

export function discernEnemyIntent(
  state: CombatState,
  input: DiscernEnemyIntentInput,
): CombatState {
  const discernment = applyEnemyIntentDiscernment(state, input.targetEnemyInstanceId)

  return appendLog(discernment.state, {
    type: 'INTENT_DISCERNED',
    sourceId: input.sourceId,
    targetId: input.targetEnemyInstanceId,
    payload: {
      reason: input.reason,
      result: discernment.result,
      intentId: discernment.intent?.id ?? null,
      intentKind: discernment.intent?.kind ?? null,
      previewTurnOffset: discernment.previewTurnOffset ?? null,
    },
  })
}

export function applyEnemyIntentDiscernment(
  state: CombatState,
  targetEnemyInstanceId?: EnemyInstanceId,
): IntentDiscernment {
  const target = selectIntentTarget(state, targetEnemyInstanceId)

  if (!target) {
    return {
      state,
      result: 'no_target',
    }
  }

  if (!target.currentIntent) {
    return {
      state,
      result: 'no_intent',
    }
  }

  if (target.currentIntentVisibility === 'masked') {
    const nextMaskMode = target.intentMaskMode === 'current_only' ? 'none' : target.intentMaskMode
    const nextTarget = {
      ...target,
      currentIntentVisibility: 'revealed' as const,
      intentMaskMode: nextMaskMode,
    }

    return {
      state: replaceIntentTarget(state, nextTarget),
      result: 'current_revealed',
      intent: target.currentIntent,
      previewTurnOffset: 0,
    }
  }

  if (!target.nextIntent) {
    return {
      state,
      result: 'no_intent',
    }
  }

  return {
    state: replaceIntentTarget(state, {
      ...target,
      nextIntentPreview: target.nextIntent,
    }),
    result: 'next_previewed',
    intent: target.nextIntent,
    previewTurnOffset: 1,
  }
}

function selectIntentTarget(
  state: CombatState,
  targetEnemyInstanceId?: EnemyInstanceId,
) {
  if (targetEnemyInstanceId) {
    return state.enemies.find((enemy) => enemy.instanceId === targetEnemyInstanceId)
  }

  return state.enemies.find((enemy) => enemy.currentForm > 0)
}

function replaceIntentTarget(
  state: CombatState,
  target: CombatState['enemies'][number],
): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.instanceId === target.instanceId ? target : enemy,
    ),
  }
}
