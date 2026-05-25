import type {
  ArtifactCollectionState,
  ArtifactDefinition,
  ArtifactId,
  ArtifactOfferAnchorId,
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
  FRACTURE_NEEDLE_ARTIFACT_ID,
  DOOM_BELL_ARTIFACT_ID,
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
  readonly routeSeed?: string
  readonly buildAnchorIds?: readonly ArtifactOfferAnchorId[]
}

export function createArtifactOfferAnchorIds(
  run: TutorialRunState,
  routeTendencyIds: readonly RouteTendencyId[] = [],
): readonly ArtifactOfferAnchorId[] {
  const anchorIds: ArtifactOfferAnchorId[] = []

  if (
    run.settlements.some((record) => record.settlement === 'catalogue') ||
    run.verdict.records.some((record) => record.choiceId === 'register')
  ) {
    anchorIds.push('ask_name')
  }

  if (run.settlements.some((record) => record.settlement === 'vanquish')) {
    anchorIds.push('break_form')
  }

  if (run.redInkRecords.some((record) => !record.skipped) || run.pendingRedInk) {
    anchorIds.push('red_ink')
  }

  if (run.resources.ink > 0) {
    anchorIds.push('ink')
  }

  if (run.resources.fracture > 0) {
    anchorIds.push('fracture')
  }

  if (run.verdict.records.length > 0) {
    anchorIds.push('verdict')
  }

  if (run.artifacts.artifacts.some((artifact) => artifact.pendingBacklash)) {
    anchorIds.push('artifact_maintenance')
  }

  for (const tendencyId of routeTendencyIds) {
    if (tendencyId === 'steady') {
      anchorIds.push('route_steady')
    }

    if (tendencyId === 'catalogue') {
      anchorIds.push('route_catalogue')
    }

    if (tendencyId === 'fracture') {
      anchorIds.push('route_fracture')
    }

    if (tendencyId === 'supply') {
      anchorIds.push('route_supply')
    }

    if (tendencyId === 'high_pressure') {
      anchorIds.push('route_high_pressure')
    }
  }

  return uniqueArtifactOfferAnchorIds(anchorIds).slice(0, 5)
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
        contextAnchorIds: offer.contextAnchorIds,
        selectedAnchorIds: option.anchorIds,
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
  const contextAnchorIds = getContextArtifactOfferAnchorIds(context)
  const options = orderArtifactOfferIds(getArtifactOfferIds(stage), run.roleId, context)
    .filter((artifactDefinitionId) => !ownedArtifactIds.has(artifactDefinitionId))
    .map((artifactDefinitionId, index) => {
      const definition = artifactDefinitions.find((candidate) => candidate.id === artifactDefinitionId)
      const anchorIds = definition ? getArtifactOptionAnchorIds(definition, context) : undefined

      return definition
        ? {
            id: `${stage}_${index + 1}_${artifactDefinitionId}`,
            artifactDefinitionId,
            ...(anchorIds ? { anchorIds } : {}),
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
    contextAnchorIds,
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

const ANCHOR_ARTIFACT_WEIGHTS: Record<
  ArtifactOfferAnchorId,
  Readonly<Partial<Record<ArtifactId, number>>>
> = {
  ask_name: {
    [BONE_MIRROR_ARTIFACT_ID]: 3,
    [REGISTRY_INKSTONE_ARTIFACT_ID]: 3,
    [NAME_TETHER_SPINDLE_ARTIFACT_ID]: 3,
    [COURT_CHIME_ARTIFACT_ID]: 2,
  },
  break_form: {
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 3,
    [ASH_LAMP_ARTIFACT_ID]: 2,
    [DOOM_BELL_ARTIFACT_ID]: 2,
  },
  red_ink: {
    [CINNABAR_DOU_ARTIFACT_ID]: 4,
    [ASH_LAMP_ARTIFACT_ID]: 3,
  },
  altar: {
    [ASH_LAMP_ARTIFACT_ID]: 3,
    [NAME_TETHER_SPINDLE_ARTIFACT_ID]: 2,
  },
  fracture: {
    [FRACTURE_NEEDLE_ARTIFACT_ID]: 4,
    [DOOM_BELL_ARTIFACT_ID]: 3,
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 2,
  },
  verdict: {
    [FRACTURE_NEEDLE_ARTIFACT_ID]: 3,
    [DOOM_BELL_ARTIFACT_ID]: 3,
    [CINNABAR_DOU_ARTIFACT_ID]: 2,
  },
  ink: {
    [REGISTRY_INKSTONE_ARTIFACT_ID]: 3,
    [ASH_LAMP_ARTIFACT_ID]: 2,
    [CINNABAR_DOU_ARTIFACT_ID]: 2,
  },
  seal_momentum: {
    [COURT_CHIME_ARTIFACT_ID]: 3,
    [SEAL_DOOR_TABLET_ARTIFACT_ID]: 3,
  },
  artifact_maintenance: {
    [ASH_LAMP_ARTIFACT_ID]: 4,
    [CINNABAR_DOU_ARTIFACT_ID]: 2,
  },
  route_steady: {},
  route_catalogue: {},
  route_fracture: {},
  route_supply: {},
  route_high_pressure: {},
}

function orderArtifactOfferIds(
  artifactIds: readonly ArtifactId[],
  roleId: PlayableRoleId | undefined,
  context: ArtifactOfferContext,
): readonly ArtifactId[] {
  const roleWeights = roleId ? ROLE_ARTIFACT_WEIGHTS[roleId] : undefined
  const routeTendencyIds = context.routeTendencyIds ?? []
  const buildAnchorIds = context.buildAnchorIds ?? []

  if (!roleWeights && routeTendencyIds.length === 0 && buildAnchorIds.length === 0 && !context.routeSeed) {
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
        ) +
        buildAnchorIds.reduce(
          (total, anchorId) => total + (ANCHOR_ARTIFACT_WEIGHTS[anchorId]?.[artifactId] ?? 0),
          0,
        ),
      seedRank: context.routeSeed
        ? getSeededArtifactRank(`${context.routeSeed}:${artifactId}`)
        : index,
    }))
    .sort((left, right) => right.score - left.score || left.seedRank - right.seedRank || left.index - right.index)
    .map(({ artifactId }) => artifactId)
}

function getContextArtifactOfferAnchorIds(
  context: ArtifactOfferContext,
): readonly ArtifactOfferAnchorId[] | undefined {
  const routeAnchorIds = (context.routeTendencyIds ?? []).flatMap((tendencyId) => {
    if (tendencyId === 'steady') {
      return ['route_steady' as const]
    }

    if (tendencyId === 'catalogue') {
      return ['route_catalogue' as const]
    }

    if (tendencyId === 'fracture') {
      return ['route_fracture' as const]
    }

    if (tendencyId === 'supply') {
      return ['route_supply' as const]
    }

    if (tendencyId === 'high_pressure') {
      return ['route_high_pressure' as const]
    }

    return []
  })
  const anchorIds = uniqueArtifactOfferAnchorIds([
    ...(context.buildAnchorIds ?? []),
    ...routeAnchorIds,
  ])

  return anchorIds.length ? anchorIds.slice(0, 5) : undefined
}

function getArtifactOptionAnchorIds(
  definition: ArtifactDefinition,
  context: ArtifactOfferContext,
): readonly ArtifactOfferAnchorId[] | undefined {
  const anchorIds: ArtifactOfferAnchorId[] = []

  if (definition.tags.includes('ask_name') || definition.tags.includes('catalogue')) {
    anchorIds.push('ask_name')
  }

  if (definition.tags.includes('break_form')) {
    anchorIds.push('break_form')
  }

  if (definition.tags.includes('red_ink')) {
    anchorIds.push('red_ink')
  }

  if (definition.tags.includes('altar')) {
    anchorIds.push('altar')
  }

  if (definition.tags.includes('fracture')) {
    anchorIds.push('fracture')
  }

  if (definition.tags.includes('verdict') || definition.triggerType === 'verdict_modifier') {
    anchorIds.push('verdict')
  }

  if (definition.tags.includes('ink')) {
    anchorIds.push('ink')
  }

  if (definition.tags.includes('seal_momentum')) {
    anchorIds.push('seal_momentum')
  }

  const contextAnchorIds = new Set(context.buildAnchorIds ?? [])
  const matchedContextAnchors = anchorIds.filter((anchorId) => contextAnchorIds.has(anchorId))
  const displayAnchorIds = uniqueArtifactOfferAnchorIds([
    ...matchedContextAnchors,
    ...anchorIds,
  ]).slice(0, 3)

  return displayAnchorIds.length ? displayAnchorIds : undefined
}

function uniqueArtifactOfferAnchorIds(
  anchorIds: readonly ArtifactOfferAnchorId[],
): readonly ArtifactOfferAnchorId[] {
  return [...new Set(anchorIds)]
}

function getSeededArtifactRank(seedKey: string) {
  let hash = 0

  for (let index = 0; index < seedKey.length; index += 1) {
    hash = (hash * 31 + seedKey.charCodeAt(index)) >>> 0
  }

  return hash
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
