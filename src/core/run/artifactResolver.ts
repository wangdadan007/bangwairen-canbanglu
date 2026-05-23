import type {
  ArtifactCollectionState,
  ArtifactDefinition,
  ArtifactId,
  ArtifactOverloadKind,
  ArtifactProgressKind,
  ArtifactState,
  CardId,
  PlayableRoleId,
  RouteTendencyId,
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
export const RED_SASH_FIRE_WHEEL_ARTIFACT_ID: ArtifactId = 'artifact_red_sash_fire_wheel'
export const WHIP_BACKLASH_CARD_ID: CardId = 'card_cracked_whip_echo'
export const MID_CHAPTER_ARTIFACT_REWARD_ENCOUNTER_ID = 'encounter_elite_incense_clerk'
export const MID_CHAPTER_ARTIFACT_REWARD_COMPLETED_ENCOUNTER_COUNT = 5
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
const MID_CHAPTER_ARTIFACT_CANDIDATE_IDS: readonly ArtifactId[] = [
  ...MID_CHAPTER_ARTIFACT_OFFER_IDS,
  COURT_CHIME_ARTIFACT_ID,
  ASH_LAMP_ARTIFACT_ID,
]
const BOSS_CLEAR_ARTIFACT_CANDIDATE_IDS: readonly ArtifactId[] = [
  ...BOSS_CLEAR_ARTIFACT_OFFER_IDS,
  REGISTRY_INKSTONE_ARTIFACT_ID,
  SEAL_DOOR_TABLET_ARTIFACT_ID,
  ASH_LAMP_ARTIFACT_ID,
  CINNABAR_DOU_ARTIFACT_ID,
]
const HIDE_INTENT_BACKLASH_ARTIFACT_IDS: readonly ArtifactId[] = [
  BONE_MIRROR_ARTIFACT_ID,
  COURT_CHIME_ARTIFACT_ID,
  NAME_TETHER_SPINDLE_ARTIFACT_ID,
  REGISTRY_INKSTONE_ARTIFACT_ID,
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
  readonly breakChainCount?: number
}

export interface ArtifactBacklashRecord {
  readonly artifactId: ArtifactId
  readonly effectType: string
  readonly amount?: number
  readonly cardDefinitionId?: CardId
  readonly fractureDelta?: number
  readonly playerFormDelta?: number
}

export interface ArtifactBacklashResolution {
  readonly artifacts: ArtifactCollectionState
  readonly resources: TutorialResourceState
  readonly temporaryResourceDelta: TutorialResourceState
  readonly temporaryPlayerFormDelta: number
  readonly extraHandDefinitionIds: readonly CardId[]
  readonly records: readonly ArtifactBacklashRecord[]
}

export interface ArtifactOfferContext {
  readonly routeTendencyIds?: readonly RouteTendencyId[]
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
  context: ArtifactOfferContext = {},
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
    !run.roleId &&
    !hasArtifactOfferRecord(run, 'starter') &&
    run.completedEncounterIds.length === 0
  ) {
    return createRunWithArtifactOffer(run, artifactDefinitions, 'starter', context)
  }

  if (
    run.status === 'active' &&
    !hasArtifactOfferRecord(run, 'mid_chapter') &&
    hasReachedMidChapterArtifactCheckpoint(run)
  ) {
    return createRunWithArtifactOffer(run, artifactDefinitions, 'mid_chapter', context)
  }

  if (
    run.status === 'complete' &&
    !hasArtifactOfferRecord(run, 'boss_clear') &&
    run.completedEncounterIds.includes(BOSS_ARTIFACT_REWARD_ENCOUNTER_ID)
  ) {
    return createRunWithArtifactOffer(run, artifactDefinitions, 'boss_clear', context)
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

  if (input.breakChainCount) {
    progressEvents.push({
      kind: 'turn_two_break_shape_cards',
      amount: input.breakChainCount,
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
  let temporaryPlayerFormDelta = 0

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

    if (artifact.definitionId === RED_SASH_FIRE_WHEEL_ARTIFACT_ID) {
      const playerFormDelta = -4
      temporaryPlayerFormDelta += playerFormDelta
      records.push({
        artifactId: artifact.id,
        effectType: 'temporary_player_form_loss',
        amount: Math.abs(playerFormDelta),
        playerFormDelta,
      })
    }

    if (HIDE_INTENT_BACKLASH_ARTIFACT_IDS.includes(artifact.definitionId)) {
      records.push({
        artifactId: artifact.id,
        effectType: 'hide_intent_before_ask_name',
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
    temporaryPlayerFormDelta,
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
  context: ArtifactOfferContext,
): TutorialRunState {
  const offer = createTutorialArtifactOffer(run, artifactDefinitions, stage, context)

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
  context: ArtifactOfferContext,
): TutorialArtifactOffer | undefined {
  const ownedArtifactIds = new Set(run.artifacts.artifacts.map((artifact) => artifact.definitionId))
  const artifactOfferRecords = run.artifactOfferRecords ?? []
  const options = orderArtifactOfferIds(getArtifactOfferIds(stage), run.roleId, context)
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
    return MID_CHAPTER_ARTIFACT_CANDIDATE_IDS
  }

  return BOSS_CLEAR_ARTIFACT_CANDIDATE_IDS
}

const ROLE_ARTIFACT_WEIGHTS: Record<PlayableRoleId, Readonly<Partial<Record<ArtifactId, number>>>> = {
  role_hengjian: {
    [CINNABAR_DOU_ARTIFACT_ID]: 7,
    [REGISTRY_INKSTONE_ARTIFACT_ID]: 5,
    [NAME_TETHER_SPINDLE_ARTIFACT_ID]: 4,
    [ASH_LAMP_ARTIFACT_ID]: 2,
  },
  role_zhaowei: {
    [REGISTRY_INKSTONE_ARTIFACT_ID]: 6,
    [COURT_CHIME_ARTIFACT_ID]: 5,
    [NAME_TETHER_SPINDLE_ARTIFACT_ID]: 5,
    [ASH_LAMP_ARTIFACT_ID]: 2,
  },
  role_lianjin: {
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 6,
    [FRACTURE_NEEDLE_ARTIFACT_ID]: 5,
    [DOOM_BELL_ARTIFACT_ID]: 5,
    [ASH_LAMP_ARTIFACT_ID]: 3,
  },
}

const ROUTE_ARTIFACT_WEIGHTS: Record<RouteTendencyId, Readonly<Partial<Record<ArtifactId, number>>>> = {
  steady: {
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 4,
    [ASH_LAMP_ARTIFACT_ID]: 2,
    [CINNABAR_DOU_ARTIFACT_ID]: 2,
  },
  catalogue: {
    [NAME_TETHER_SPINDLE_ARTIFACT_ID]: 5,
    [REGISTRY_INKSTONE_ARTIFACT_ID]: 4,
    [CINNABAR_DOU_ARTIFACT_ID]: 3,
  },
  fracture: {
    [FRACTURE_NEEDLE_ARTIFACT_ID]: 6,
    [DOOM_BELL_ARTIFACT_ID]: 5,
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 3,
  },
  supply: {
    [ASH_LAMP_ARTIFACT_ID]: 3,
    [CINNABAR_DOU_ARTIFACT_ID]: 2,
    [REGISTRY_INKSTONE_ARTIFACT_ID]: 2,
  },
  high_pressure: {
    [FRACTURE_NEEDLE_ARTIFACT_ID]: 5,
    [DOOM_BELL_ARTIFACT_ID]: 4,
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 4,
  },
}

function orderArtifactOfferIds(
  artifactIds: readonly ArtifactId[],
  roleId: PlayableRoleId | undefined,
  context: ArtifactOfferContext,
): readonly ArtifactId[] {
  const roleWeights = roleId ? ROLE_ARTIFACT_WEIGHTS[roleId] : undefined
  const routeTendencyIds = context.routeTendencyIds ?? []

  if (!roleWeights && routeTendencyIds.length === 0) {
    return artifactIds
  }

  return artifactIds
    .map((artifactId, index) => ({
      artifactId,
      index,
      score:
        (roleWeights?.[artifactId] ?? 0) +
        routeTendencyIds.reduce(
          (total, tendencyId) => total + (ROUTE_ARTIFACT_WEIGHTS[tendencyId]?.[artifactId] ?? 0),
          0,
        ),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ artifactId }) => artifactId)
}

function hasReachedMidChapterArtifactCheckpoint(run: TutorialRunState) {
  return (
    run.completedEncounterIds.includes(MID_CHAPTER_ARTIFACT_REWARD_ENCOUNTER_ID) ||
    run.completedEncounterIds.length >= MID_CHAPTER_ARTIFACT_REWARD_COMPLETED_ENCOUNTER_COUNT
  )
}

function hasArtifactOfferRecord(run: TutorialRunState, stage: TutorialArtifactOfferStage) {
  return (run.artifactOfferRecords ?? []).some((record) => record.stage === stage)
}
