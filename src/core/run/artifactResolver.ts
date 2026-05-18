import type {
  ArtifactCollectionState,
  ArtifactDefinition,
  ArtifactId,
  ArtifactOverloadKind,
  ArtifactProgressKind,
  ArtifactState,
  CardId,
  TutorialResourceState,
} from '../../types'
import { applyTutorialResourceDelta } from './resourceResolver'

export const WHIP_FRAGMENT_ARTIFACT_ID: ArtifactId = 'artifact_whip_fragment'
export const BONE_MIRROR_ARTIFACT_ID: ArtifactId = 'artifact_bone_mirror'
export const COURT_CHIME_ARTIFACT_ID: ArtifactId = 'artifact_court_chime'
export const NAME_TETHER_SPINDLE_ARTIFACT_ID: ArtifactId = 'artifact_name_tether_spindle'
export const CINNABAR_DOU_ARTIFACT_ID: ArtifactId = 'artifact_cinnabar_dou'
export const FRACTURE_NEEDLE_ARTIFACT_ID: ArtifactId = 'artifact_fracture_needle'
export const REGISTRY_INKSTONE_ARTIFACT_ID: ArtifactId = 'artifact_registry_inkstone'
export const WHIP_BACKLASH_CARD_ID: CardId = 'card_cracked_whip_echo'

export interface ArtifactProgressEvent {
  readonly kind: ArtifactProgressKind
  readonly amount?: number
}

export interface ArtifactOverloadEvent {
  readonly kind: ArtifactOverloadKind
}

export interface ArtifactBattleProgressInput {
  readonly askNameCount?: number
  readonly catalogueNamedEnemyCount?: number
  readonly vanquishNamedEnemyBeforeNamedCount?: number
}

export interface ArtifactBacklashRecord {
  readonly artifactId: ArtifactId
  readonly effectType: string
  readonly amount?: number
  readonly cardDefinitionId?: CardId
  readonly fractureDelta?: number
}

export interface ArtifactBacklashResolution {
  readonly artifacts: ArtifactCollectionState
  readonly resources: TutorialResourceState
  readonly temporaryResourceDelta: TutorialResourceState
  readonly extraHandDefinitionIds: readonly CardId[]
  readonly records: readonly ArtifactBacklashRecord[]
}

export function createInitialArtifactCollection(
  artifactDefinitions: readonly ArtifactDefinition[] = [],
): ArtifactCollectionState {
  return {
    artifacts: artifactDefinitions.map((definition) => ({
      id: definition.id,
      definitionId: definition.id,
      bindingStatus: 'unbound',
      bindCondition: definition.bindCondition,
      bindProgress: 0,
      overloadKind: definition.overloadCondition?.kind,
      chargesRemaining: definition.chargesPerBattle ?? 0,
      hasTriggeredThisBattle: false,
      triggerCountThisBattle: 0,
      hasOverloadedThisBattle: false,
      consecutiveOverloadBattles: 0,
      pendingBacklash: false,
    })),
  }
}

export function advanceArtifactsAfterBattle(
  collection: ArtifactCollectionState,
  input: ArtifactBattleProgressInput = {},
): ArtifactCollectionState {
  const progressEvents: ArtifactProgressEvent[] = []
  const overloadEvents: ArtifactOverloadEvent[] = []

  if (input.askNameCount) {
    progressEvents.push({
      kind: 'ask_name',
      amount: input.askNameCount,
    })
  }

  if (input.catalogueNamedEnemyCount) {
    progressEvents.push({
      kind: 'catalogue_named_enemy',
      amount: input.catalogueNamedEnemyCount,
    })
  }

  if (input.vanquishNamedEnemyBeforeNamedCount) {
    overloadEvents.push({
      kind: 'vanquish_named_enemy_before_named',
    })
  }

  return settleArtifactBattleWindow(
    markArtifactOverloads(advanceArtifactProgress(collection, progressEvents), overloadEvents),
  )
}

export function resolveArtifactBacklashesAtBattleStart(
  collection: ArtifactCollectionState,
  resources: TutorialResourceState,
): ArtifactBacklashResolution {
  const extraHandDefinitionIds: CardId[] = []
  const records: ArtifactBacklashRecord[] = []
  let nextResources = resources
  let temporaryResourceDelta: TutorialResourceState = {
    ink: 0,
    doom: 0,
    fracture: 0,
  }

  const artifacts = collection.artifacts.map((artifact) => {
    if (!artifact.pendingBacklash) {
      return artifact
    }

    if (artifact.definitionId === WHIP_FRAGMENT_ARTIFACT_ID) {
      extraHandDefinitionIds.push(WHIP_BACKLASH_CARD_ID)
      records.push({
        artifactId: artifact.id,
        effectType: 'add_temporary_card',
        amount: 1,
        cardDefinitionId: WHIP_BACKLASH_CARD_ID,
      })
    }

    if (artifact.definitionId === FRACTURE_NEEDLE_ARTIFACT_ID) {
      const fractureDelta = 1
      nextResources = applyTutorialResourceDelta(nextResources, {
        fracture: fractureDelta,
      })
      temporaryResourceDelta = applyTutorialResourceDelta(temporaryResourceDelta, {
        fracture: fractureDelta,
      })
      records.push({
        artifactId: artifact.id,
        effectType: 'temporary_fracture',
        amount: fractureDelta,
        fractureDelta,
      })
    }

    return {
      ...artifact,
      pendingBacklash: false,
      consecutiveOverloadBattles: 0,
    }
  })

  return {
    artifacts: {
      artifacts,
    },
    resources: nextResources,
    temporaryResourceDelta,
    extraHandDefinitionIds,
    records,
  }
}

export function getEraseRewardBonusCount(collection: ArtifactCollectionState): number {
  const artifact = collection.artifacts.find(
    (candidate) => candidate.definitionId === FRACTURE_NEEDLE_ARTIFACT_ID,
  )

  if (!artifact) {
    return 0
  }

  return artifact.bindingStatus === 'bound' ? 2 : 1
}

export function advanceArtifactProgress(
  collection: ArtifactCollectionState,
  events: readonly ArtifactProgressEvent[],
): ArtifactCollectionState {
  if (events.length === 0) {
    return collection
  }

  return {
    artifacts: collection.artifacts.map((artifact) =>
      advanceSingleArtifactProgress(artifact, events),
    ),
  }
}

export function markArtifactOverloads(
  collection: ArtifactCollectionState,
  events: readonly ArtifactOverloadEvent[],
): ArtifactCollectionState {
  if (events.length === 0) {
    return collection
  }

  const overloadedKinds = new Set(events.map((event) => event.kind))

  return {
    artifacts: collection.artifacts.map((artifact) =>
      artifact.overloadKind && overloadedKinds.has(artifact.overloadKind)
        ? {
            ...artifact,
            hasOverloadedThisBattle: true,
          }
        : artifact,
    ),
  }
}

export function settleArtifactBattleWindow(
  collection: ArtifactCollectionState,
): ArtifactCollectionState {
  return {
    artifacts: collection.artifacts.map((artifact) => {
      const nextConsecutiveOverloadBattles = artifact.hasOverloadedThisBattle
        ? artifact.consecutiveOverloadBattles + 1
        : 0

      return {
        ...artifact,
        hasTriggeredThisBattle: false,
        triggerCountThisBattle: 0,
        hasOverloadedThisBattle: false,
        consecutiveOverloadBattles: nextConsecutiveOverloadBattles,
        pendingBacklash:
          artifact.pendingBacklash || nextConsecutiveOverloadBattles >= 2,
      }
    }),
  }
}

function advanceSingleArtifactProgress(
  artifact: ArtifactState,
  events: readonly ArtifactProgressEvent[],
): ArtifactState {
  const progressDelta = events
    .filter((event) => event.kind === artifact.bindCondition.kind)
    .reduce((total, event) => total + (event.amount ?? 1), 0)

  if (progressDelta <= 0) {
    return artifact
  }

  const nextProgress = Math.min(
    artifact.bindCondition.requiredCount,
    artifact.bindProgress + progressDelta,
  )

  return {
    ...artifact,
    bindingStatus:
      nextProgress >= artifact.bindCondition.requiredCount ? 'bound' : artifact.bindingStatus,
    bindProgress: nextProgress,
  }
}
