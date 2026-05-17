import type {
  ArtifactCollectionState,
  ArtifactDefinition,
  ArtifactOverloadKind,
  ArtifactProgressKind,
  ArtifactState,
} from '../../types'

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
