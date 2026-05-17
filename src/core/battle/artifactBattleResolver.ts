import { appendLog } from '../log/actionLog'
import { BONE_MIRROR_ARTIFACT_ID, WHIP_FRAGMENT_ARTIFACT_ID } from '../run/artifactResolver'
import type { CombatState, EnemyInstanceId, GameEntityId } from '../../types'

export function triggerArtifactsAfterAskName(
  state: CombatState,
  sourceId: GameEntityId,
): CombatState {
  const boneMirror = state.artifacts.artifacts.find(
    (artifact) => artifact.definitionId === BONE_MIRROR_ARTIFACT_ID,
  )

  if (!boneMirror || state.triggeredArtifactIds.includes(boneMirror.id)) {
    return state
  }

  const askNameEntry = state.actionLog
    .slice()
    .reverse()
    .find(
      (entry) =>
        entry.type === 'NAME_ASKED' &&
        entry.turn === state.turn &&
        entry.sourceId === sourceId,
    )

  if (!askNameEntry) {
    return state
  }

  const target = state.enemies.find((enemy) => enemy.instanceId === askNameEntry.targetId)
  const nextState: CombatState = {
    ...state,
    artifacts: {
      artifacts: state.artifacts.artifacts.map((artifact) =>
        artifact.id === boneMirror.id
          ? {
              ...artifact,
              hasTriggeredThisBattle: true,
              triggerCountThisBattle: artifact.triggerCountThisBattle + 1,
            }
          : artifact,
      ),
    },
    triggeredArtifactIds: [...state.triggeredArtifactIds, boneMirror.id],
  }

  return appendLog(nextState, {
    type: 'ARTIFACT_TRIGGERED',
    sourceId: boneMirror.id,
    targetId: target?.instanceId,
    payload: {
      effectType: 'peek_intent_after_ask_name',
      result: 'peeked',
      intentId: target?.currentIntent?.id ?? null,
      intentKind: target?.currentIntent?.kind ?? null,
      boundBonus: boneMirror.bindingStatus === 'bound' ? 1 : 0,
    },
  })
}

export function triggerArtifactsAfterEnemyNamed(
  state: CombatState,
  sourceId: GameEntityId,
): CombatState {
  const whipFragment = state.artifacts.artifacts.find(
    (artifact) => artifact.definitionId === WHIP_FRAGMENT_ARTIFACT_ID,
  )

  if (!whipFragment || state.triggeredArtifactIds.includes(whipFragment.id)) {
    return state
  }

  const namedEntry = state.actionLog
    .slice()
    .reverse()
    .find(
      (entry) =>
        entry.type === 'ENEMY_NAMED' &&
        entry.turn === state.turn &&
        entry.sourceId === sourceId,
    )

  if (!namedEntry) {
    return state
  }

  const bonusAmount = whipFragment.bindingStatus === 'bound' ? 5 : 2
  const nextState: CombatState = {
    ...state,
    artifacts: {
      artifacts: state.artifacts.artifacts.map((artifact) =>
        artifact.id === whipFragment.id
          ? {
              ...artifact,
              hasTriggeredThisBattle: true,
              triggerCountThisBattle: artifact.triggerCountThisBattle + 1,
            }
          : artifact,
      ),
    },
    pendingArtifactBreakShapeBonus: {
      artifactId: whipFragment.id,
      amount: bonusAmount,
    },
    triggeredArtifactIds: [...state.triggeredArtifactIds, whipFragment.id],
  }

  return appendLog(nextState, {
    type: 'ARTIFACT_TRIGGERED',
    sourceId: whipFragment.id,
    targetId: namedEntry.targetId,
    payload: {
      effectType: 'next_break_shape_bonus',
      result: 'prepared',
      amount: bonusAmount,
    },
  })
}

export function consumePendingBreakShapeBonus(
  state: CombatState,
  targetEnemyInstanceId?: EnemyInstanceId,
): {
  readonly state: CombatState
  readonly bonusAmount: number
} {
  const pendingBonus = state.pendingArtifactBreakShapeBonus

  if (!pendingBonus) {
    return {
      state,
      bonusAmount: 0,
    }
  }

  const nextState: CombatState = {
    ...state,
    pendingArtifactBreakShapeBonus: undefined,
  }

  return {
    state: appendLog(nextState, {
      type: 'ARTIFACT_TRIGGERED',
      sourceId: pendingBonus.artifactId,
      targetId: targetEnemyInstanceId,
      payload: {
        effectType: 'next_break_shape_bonus',
        result: 'consumed',
        amount: pendingBonus.amount,
      },
    }),
    bonusAmount: pendingBonus.amount,
  }
}
