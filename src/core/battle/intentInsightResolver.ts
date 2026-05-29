import { appendLog } from '../log/actionLog'
import { extendNextAltarForDiscernment } from './altarExtensionResolver'
import type {
  AltarId,
  AltarSlot,
  CombatState,
  EnemyInstanceId,
  EnemyIntentDefinition,
  GameEntityId,
} from '../../types'

export type IntentDiscernResult =
  | 'current_revealed'
  | 'altar_extended'
  | 'no_altar'
  | 'no_target'
  | 'no_intent'

export interface IntentDiscernment {
  readonly state: CombatState
  readonly result: IntentDiscernResult
  readonly intent?: EnemyIntentDefinition
  readonly previewTurnOffset?: 0
  readonly altarId?: AltarId
  readonly altarSlot?: AltarSlot
  readonly remainingAltarTriggers?: number
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
  const discernment = applyEnemyIntentDiscernment(
    state,
    input.targetEnemyInstanceId,
    input.sourceId,
  )

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
      altarId: discernment.altarId ?? null,
      altarSlot: discernment.altarSlot ?? null,
      remainingAltarTriggers: discernment.remainingAltarTriggers ?? null,
    },
  })
}

export function applyEnemyIntentDiscernment(
  state: CombatState,
  targetEnemyInstanceId?: EnemyInstanceId,
  sourceId: GameEntityId = 'player',
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

  const extension = extendNextAltarForDiscernment(state, sourceId)

  return {
    state: extension.state,
    result: extension.altarId ? 'altar_extended' : 'no_altar',
    intent: target.currentIntent,
    altarId: extension.altarId,
    altarSlot: extension.altarSlot,
    remainingAltarTriggers: extension.remainingTriggers,
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
