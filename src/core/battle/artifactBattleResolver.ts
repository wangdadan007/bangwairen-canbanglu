import { appendLog } from '../log/actionLog'
import { WHIP_FRAGMENT_ARTIFACT_ID } from '../run/artifactResolver'
import type { CombatState, EnemyInstanceId, GameEntityId } from '../../types'

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
