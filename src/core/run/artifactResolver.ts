import type {
  ArtifactCollectionState,
  ArtifactDefinition,
  ArtifactId,
  ArtifactOverloadKind,
  ArtifactProgressKind,
  ArtifactState,
  CardId,
  TutorialArtifactOffer,
  TutorialArtifactOfferStage,
  TutorialRunState,
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
export const SEAL_DOOR_TABLET_ARTIFACT_ID: ArtifactId = 'artifact_seal_door_tablet'
export const ASH_LAMP_ARTIFACT_ID: ArtifactId = 'artifact_ash_lamp'
export const DOOM_BELL_ARTIFACT_ID: ArtifactId = 'artifact_doom_bell'
export const WHIP_BACKLASH_CARD_ID: CardId = 'card_cracked_whip_echo'
export const MID_CHAPTER_ARTIFACT_REWARD_ENCOUNTER_ID = 'encounter_elite_incense_clerk'
export const BOSS_ARTIFACT_REWARD_ENCOUNTER_ID = 'encounter_boss_registry_thief'

export const STARTER_ARTIFACT_OFFER_IDS: readonly ArtifactId[] = [
  WHIP_FRAGMENT_ARTIFACT_ID,
  BONE_MIRROR_ARTIFACT_ID,
  COURT_CHIME_ARTIFACT_ID,
]
export const MID_CHAPTER_ARTIFACT_OFFER_IDS: readonly ArtifactId[] = [
  CINNABAR_DOU_ARTIFACT_ID,
  SEAL_DOOR_TABLET_ARTIFACT_ID,
  REGISTRY_INKSTONE_ARTIFACT_ID,
]
export const BOSS_CLEAR_ARTIFACT_OFFER_IDS: readonly ArtifactId[] = [
  NAME_TETHER_SPINDLE_ARTIFACT_ID,
  FRACTURE_NEEDLE_ARTIFACT_ID,
  DOOM_BELL_ARTIFACT_ID,
]

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
    artifacts: artifactDefinitions.map((definition) => createArtifactState(definition)),
  }
}

export function createStarterArtifactCollection(
  artifactDefinitions: readonly ArtifactDefinition[] = [],
): ArtifactCollectionState {
  const starterIds = new Set(STARTER_ARTIFACT_OFFER_IDS)

  return createInitialArtifactCollection(
    artifactDefinitions.filter((definition) => starterIds.has(definition.id)),
  )
}

export function createTutorialArtifactOfferIfNeeded(
  run: TutorialRunState,
  artifactDefinitions: readonly ArtifactDefinition[],
): TutorialRunState {
  if (run.status === 'failed') {
    return run
  }

  if (
    run.pendingArtifactOffer ||
    run.pendingVerdict ||
    run.pendingReward ||
    run.pendingRedInk
  ) {
    return run
  }

  if (
    run.status === 'active' &&
    !hasArtifactOfferRecord(run, 'starter') &&
    run.completedEncounterIds.length === 0
  ) {
    return createRunWithArtifactOffer(run, artifactDefinitions, 'starter')
  }

  if (
    run.status === 'active' &&
    !hasArtifactOfferRecord(run, 'mid_chapter') &&
    run.completedEncounterIds.includes(MID_CHAPTER_ARTIFACT_REWARD_ENCOUNTER_ID)
  ) {
    return createRunWithArtifactOffer(run, artifactDefinitions, 'mid_chapter')
  }

  if (
    run.status === 'complete' &&
    !hasArtifactOfferRecord(run, 'boss_clear') &&
    run.completedEncounterIds.includes(BOSS_ARTIFACT_REWARD_ENCOUNTER_ID)
  ) {
    return createRunWithArtifactOffer(run, artifactDefinitions, 'boss_clear')
  }

  return run
}

export function resolveTutorialArtifactOffer(
  run: TutorialRunState,
  artifactDefinitionId: ArtifactId,
  artifactDefinitions: readonly ArtifactDefinition[],
): TutorialRunState {
  const offer = run.pendingArtifactOffer
  const artifactOfferRecords = run.artifactOfferRecords ?? []

  if (!offer) {
    return run
  }

  const option = offer.options.find(
    (candidate) => candidate.artifactDefinitionId === artifactDefinitionId,
  )

  if (!option) {
    throw new Error(`Artifact option is not available: ${artifactDefinitionId}`)
  }

  const definition = artifactDefinitions.find((candidate) => candidate.id === artifactDefinitionId)

  if (!definition) {
    throw new Error(`Missing artifact definition: ${artifactDefinitionId}`)
  }

  return {
    ...run,
    artifacts: addArtifactToCollection(run.artifacts, definition),
    pendingArtifactOffer: undefined,
    artifactOfferRecords: [
      ...artifactOfferRecords,
      {
        id: `artifact_offer_record_${artifactOfferRecords.length + 1}`,
        stage: offer.stage,
        offeredArtifactDefinitionIds: offer.options.map(
          (candidate) => candidate.artifactDefinitionId,
        ),
        selectedArtifactDefinitionId: artifactDefinitionId,
      },
    ],
  }
}

export function addArtifactToCollection(
  collection: ArtifactCollectionState,
  definition: ArtifactDefinition,
): ArtifactCollectionState {
  if (collection.artifacts.some((artifact) => artifact.definitionId === definition.id)) {
    return collection
  }

  return {
    artifacts: [...collection.artifacts, createArtifactState(definition)],
  }
}

export function clearFirstPendingArtifactBacklash(collection: ArtifactCollectionState): {
  readonly artifacts: ArtifactCollectionState
  readonly clearedArtifact?: ArtifactState
} {
  const target = collection.artifacts.find((artifact) => artifact.pendingBacklash)

  if (!target) {
    return {
      artifacts: collection,
    }
  }

  return {
    artifacts: {
      artifacts: collection.artifacts.map((artifact) =>
        artifact.id === target.id
          ? {
              ...artifact,
              pendingBacklash: false,
              consecutiveOverloadBattles: 0,
              hasOverloadedThisBattle: false,
            }
          : artifact,
      ),
    },
    clearedArtifact: target,
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

function createArtifactState(definition: ArtifactDefinition): ArtifactState {
  return {
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
  }
}

function createRunWithArtifactOffer(
  run: TutorialRunState,
  artifactDefinitions: readonly ArtifactDefinition[],
  stage: TutorialArtifactOfferStage,
): TutorialRunState {
  const offer = createTutorialArtifactOffer(run, artifactDefinitions, stage)

  return offer
    ? {
        ...run,
        pendingArtifactOffer: offer,
      }
    : run
}

function createTutorialArtifactOffer(
  run: TutorialRunState,
  artifactDefinitions: readonly ArtifactDefinition[],
  stage: TutorialArtifactOfferStage,
): TutorialArtifactOffer | undefined {
  const ownedArtifactIds = new Set(run.artifacts.artifacts.map((artifact) => artifact.definitionId))
  const artifactOfferRecords = run.artifactOfferRecords ?? []
  const options = getArtifactOfferIds(stage)
    .filter((artifactDefinitionId) => !ownedArtifactIds.has(artifactDefinitionId))
    .map((artifactDefinitionId, index) => {
      const definition = artifactDefinitions.find((candidate) => candidate.id === artifactDefinitionId)

      return definition
        ? {
            id: `${stage}_${index + 1}_${artifactDefinitionId}`,
            artifactDefinitionId,
          }
        : undefined
    })
    .filter((option): option is TutorialArtifactOffer['options'][number] => Boolean(option))
    .slice(0, 3)

  if (options.length === 0) {
    return undefined
  }

  return {
    id: `artifact_offer_${stage}_${artifactOfferRecords.length + 1}`,
    stage,
    options,
  }
}

function getArtifactOfferIds(stage: TutorialArtifactOfferStage) {
  if (stage === 'starter') {
    return STARTER_ARTIFACT_OFFER_IDS
  }

  if (stage === 'mid_chapter') {
    return MID_CHAPTER_ARTIFACT_OFFER_IDS
  }

  return BOSS_CLEAR_ARTIFACT_OFFER_IDS
}

function hasArtifactOfferRecord(run: TutorialRunState, stage: TutorialArtifactOfferStage) {
  return (run.artifactOfferRecords ?? []).some((record) => record.stage === stage)
}
