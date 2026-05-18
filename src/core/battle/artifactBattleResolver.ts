import { appendLog } from '../log/actionLog'
import {
  BONE_MIRROR_ARTIFACT_ID,
  COURT_CHIME_ARTIFACT_ID,
  NAME_TETHER_SPINDLE_ARTIFACT_ID,
  REGISTRY_INKSTONE_ARTIFACT_ID,
  WHIP_FRAGMENT_ARTIFACT_ID,
} from '../run/artifactResolver'
import type {
  ArtifactId,
  CombatState,
  EnemyInstanceId,
  GameEntityId,
  UnlockStageId,
} from '../../types'

interface AskNameArtifactTrigger {
  readonly artifactId: ArtifactId
  readonly unlockStage: UnlockStageId
  readonly boundBonus: number
}

const ASK_NAME_PEEK_ARTIFACTS: readonly AskNameArtifactTrigger[] = [
  {
    artifactId: BONE_MIRROR_ARTIFACT_ID,
    unlockStage: 'stage_core',
    boundBonus: 1,
  },
  {
    artifactId: COURT_CHIME_ARTIFACT_ID,
    unlockStage: 'stage_abnormal_boundary',
    boundBonus: 1,
  },
  {
    artifactId: REGISTRY_INKSTONE_ARTIFACT_ID,
    unlockStage: 'stage_run_resources',
    boundBonus: 2,
  },
  {
    artifactId: NAME_TETHER_SPINDLE_ARTIFACT_ID,
    unlockStage: 'stage_three_altars',
    boundBonus: 2,
  },
]

export function triggerArtifactsAfterAskName(
  state: CombatState,
  sourceId: GameEntityId,
): CombatState {
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
  let nextState = state

  for (const trigger of ASK_NAME_PEEK_ARTIFACTS) {
    const artifact = nextState.artifacts.artifacts.find(
      (candidate) => candidate.definitionId === trigger.artifactId,
    )

    if (
      !artifact ||
      nextState.triggeredArtifactIds.includes(artifact.id) ||
      !nextState.player.unlocks.stages.includes(trigger.unlockStage)
    ) {
      continue
    }

    nextState = {
      ...nextState,
      artifacts: {
        artifacts: nextState.artifacts.artifacts.map((candidate) =>
          candidate.id === artifact.id
            ? {
                ...candidate,
                hasTriggeredThisBattle: true,
                triggerCountThisBattle: candidate.triggerCountThisBattle + 1,
              }
            : candidate,
        ),
      },
      triggeredArtifactIds: [...nextState.triggeredArtifactIds, artifact.id],
    }

    nextState = appendLog(nextState, {
      type: 'ARTIFACT_TRIGGERED',
      sourceId: artifact.id,
      targetId: target?.instanceId,
      payload: {
        effectType: 'peek_intent_after_ask_name',
        result: 'peeked',
        intentId: target?.currentIntent?.id ?? null,
        intentKind: target?.currentIntent?.kind ?? null,
        boundBonus: artifact.bindingStatus === 'bound' ? trigger.boundBonus : 0,
      },
    })
  }

  return nextState
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
