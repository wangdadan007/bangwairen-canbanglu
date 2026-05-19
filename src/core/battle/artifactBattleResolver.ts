import { appendLog } from '../log/actionLog'
import { applyTutorialResourceDelta } from '../run/resourceResolver'
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
  readonly effectType:
    | 'peek_intent_after_ask_name'
    | 'seal_momentum_after_ask_name'
    | 'gain_ink_after_ask_name'
  readonly baseAmount?: number
  readonly boundAmount?: number
  readonly boundBonus: number
}

const ASK_NAME_ARTIFACTS: readonly AskNameArtifactTrigger[] = [
  {
    artifactId: BONE_MIRROR_ARTIFACT_ID,
    unlockStage: 'stage_core',
    effectType: 'peek_intent_after_ask_name',
    boundBonus: 1,
  },
  {
    artifactId: COURT_CHIME_ARTIFACT_ID,
    unlockStage: 'stage_abnormal_boundary',
    effectType: 'seal_momentum_after_ask_name',
    baseAmount: 1,
    boundAmount: 2,
    boundBonus: 0,
  },
  {
    artifactId: REGISTRY_INKSTONE_ARTIFACT_ID,
    unlockStage: 'stage_run_resources',
    effectType: 'gain_ink_after_ask_name',
    baseAmount: 1,
    boundAmount: 2,
    boundBonus: 0,
  },
  {
    artifactId: NAME_TETHER_SPINDLE_ARTIFACT_ID,
    unlockStage: 'stage_three_altars',
    effectType: 'peek_intent_after_ask_name',
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

  for (const trigger of ASK_NAME_ARTIFACTS) {
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

    nextState = markArtifactTriggered(nextState, artifact.id)
    nextState = resolveAskNameArtifactTrigger(nextState, trigger, artifact.id, target)
  }

  return nextState
}

function resolveAskNameArtifactTrigger(
  state: CombatState,
  trigger: AskNameArtifactTrigger,
  artifactId: ArtifactId,
  target: CombatState['enemies'][number] | undefined,
): CombatState {
  if (trigger.effectType === 'seal_momentum_after_ask_name') {
    const amount = getArtifactTriggerAmount(state, artifactId, trigger)
    const nextIncomingForce = Math.max(0, (target?.incomingForce ?? 0) - amount)
    const sealedAmount = (target?.incomingForce ?? 0) - nextIncomingForce
    const nextState = target
      ? {
          ...state,
          enemies: state.enemies.map((enemy) =>
            enemy.instanceId === target.instanceId
              ? {
                  ...enemy,
                  incomingForce: nextIncomingForce,
                }
              : enemy,
          ),
        }
      : state

    return appendLog(nextState, {
      type: 'ARTIFACT_TRIGGERED',
      sourceId: artifactId,
      targetId: target?.instanceId,
      payload: {
        effectType: trigger.effectType,
        result: 'sealed',
        amount: sealedAmount,
        requestedAmount: amount,
        remainingIncomingForce: nextIncomingForce,
      },
    })
  }

  if (trigger.effectType === 'gain_ink_after_ask_name') {
    const amount = getArtifactTriggerAmount(state, artifactId, trigger)
    const nextResources = applyTutorialResourceDelta(state.resources, {
      ink: amount,
    })

    return appendLog(
      {
        ...state,
        resources: nextResources,
      },
      {
        type: 'ARTIFACT_TRIGGERED',
        sourceId: artifactId,
        targetId: target?.instanceId,
        payload: {
          effectType: trigger.effectType,
          result: 'gain_ink',
          amount,
          currentInk: nextResources.ink,
        },
      },
    )
  }

  return appendLog(state, {
    type: 'ARTIFACT_TRIGGERED',
    sourceId: artifactId,
    targetId: target?.instanceId,
    payload: {
      effectType: 'peek_intent_after_ask_name',
      result: 'peeked',
      intentId: target?.currentIntent?.id ?? null,
      intentKind: target?.currentIntent?.kind ?? null,
      boundBonus: getArtifactBindingStatus(state, artifactId) === 'bound' ? trigger.boundBonus : 0,
    },
  })
}

function markArtifactTriggered(state: CombatState, artifactId: ArtifactId): CombatState {
  return {
    ...state,
    artifacts: {
      artifacts: state.artifacts.artifacts.map((candidate) =>
        candidate.id === artifactId
          ? {
              ...candidate,
              hasTriggeredThisBattle: true,
              triggerCountThisBattle: candidate.triggerCountThisBattle + 1,
            }
          : candidate,
      ),
    },
    triggeredArtifactIds: [...state.triggeredArtifactIds, artifactId],
  }
}

function getArtifactTriggerAmount(
  state: CombatState,
  artifactId: ArtifactId,
  trigger: AskNameArtifactTrigger,
) {
  return getArtifactBindingStatus(state, artifactId) === 'bound'
    ? (trigger.boundAmount ?? trigger.baseAmount ?? 0)
    : (trigger.baseAmount ?? 0)
}

function getArtifactBindingStatus(state: CombatState, artifactId: ArtifactId) {
  return state.artifacts.artifacts.find((artifact) => artifact.id === artifactId)?.bindingStatus
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
