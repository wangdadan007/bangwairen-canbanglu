import type {
  CardId,
  EventDefinition,
  EventEffect,
  EventOptionDefinition,
  RouteNodeDefinition,
  RouteState,
  RunDeckCardId,
  TutorialEventRecord,
  TutorialEventState,
  TutorialRunState,
  IncenseSealId,
} from '../../types'
import { appendRunDeckCard, removeFirstMatchingRunDeckCard } from './deckResolver'
import { addIncenseSealToRun } from './incenseSealResolver'
import { createTutorialRedInkOffer } from './redInkResolver'
import {
  applyTutorialResourceDelta,
  canSpendTutorialResources,
} from './resourceResolver'

export function createInitialTutorialEventState(): TutorialEventState {
  return {
    completedEventIds: [],
    records: [],
  }
}

export function getAvailableEvents(
  events: readonly EventDefinition[],
  run: TutorialRunState,
): readonly EventDefinition[] {
  return events.filter(
    (event) =>
      !run.events.completedEventIds.includes(event.id) &&
      run.unlocks.stages.includes(event.unlockStage) &&
      getAvailableEventOptions(event, run).length > 0,
  )
}

export function getRouteEventCandidates(
  node: RouteNodeDefinition | undefined,
  events: readonly EventDefinition[],
  run: TutorialRunState,
): readonly EventDefinition[] {
  if (node?.type !== 'event') {
    return []
  }

  const routeEventIds = node.eventPoolIds ? new Set(node.eventPoolIds) : undefined

  return getAvailableEvents(events, run).filter(
    (event) => !routeEventIds || routeEventIds.has(event.id),
  )
}

export function getCurrentRouteEvent(
  node: RouteNodeDefinition | undefined,
  events: readonly EventDefinition[],
  run: TutorialRunState,
  routeState?: RouteState,
): EventDefinition | undefined {
  const candidates = getRouteEventCandidates(node, events, run)
  const selectedEventId = node?.id ? routeState?.eventSelections?.[node.id] : undefined
  const selectedEvent = selectedEventId
    ? candidates.find((event) => event.id === selectedEventId)
    : undefined

  return selectedEvent ?? candidates[0]
}

export function getAvailableEventOptions(
  event: EventDefinition,
  run: TutorialRunState,
): readonly EventOptionDefinition[] {
  return event.options.filter(
    (option) =>
      everyRequiredStageUnlocked(option, run) &&
      option.effects.every((effect) => isEventEffectAvailable(effect, run)),
  )
}

export function resolveTutorialEvent(
  run: TutorialRunState,
  event: EventDefinition,
  optionId: string,
): TutorialRunState {
  if (run.status !== 'active') {
    return run
  }

  if (
    run.pendingVerdict ||
    run.pendingReward ||
    run.pendingRedInk ||
    run.pendingArtifactOffer ||
    run.pendingIncenseSealOffer
  ) {
    throw new Error('Resolve pending run choice before resolving an event')
  }

  if (!run.unlocks.stages.includes(event.unlockStage)) {
    throw new Error(`Event is not unlocked: ${event.id}`)
  }

  if (run.events.completedEventIds.includes(event.id)) {
    throw new Error(`Event is already completed: ${event.id}`)
  }

  const option = getAvailableEventOptions(event, run).find(
    (candidate) => candidate.id === optionId,
  )

  if (!option) {
    throw new Error(`Event option is not available: ${optionId}`)
  }

  const result = applyEventEffects(run, option.effects)
  const record: TutorialEventRecord = {
    id: `event_record_${run.events.records.length + 1}`,
    eventId: event.id,
    optionId: option.id,
    addedCardDefinitionIds: result.addedCardDefinitionIds,
    addedIncenseSealDefinitionIds: result.addedIncenseSealDefinitionIds,
    removedDeckCardIds: result.removedDeckCardIds,
    removedCardDefinitionIds: result.removedCardDefinitionIds,
    inkDelta: result.inkDelta,
    doomDelta: result.doomDelta,
    fractureDelta: result.fractureDelta,
    createdRedInkOffer: result.createdRedInkOffer,
  }

  const runWithSeals = result.addedIncenseSealDefinitionIds.reduce(
    (currentRun, sealDefinitionId) => addIncenseSealToRun(currentRun, sealDefinitionId, 'event'),
    run,
  )

  return {
    ...run,
    deckDefinitionIds: result.deckDefinitionIds,
    deckCards: result.deckCards,
    incenseSeals: runWithSeals.incenseSeals,
    resources: applyTutorialResourceDelta(run.resources, {
      ink: result.inkDelta,
      doom: result.doomDelta,
      fracture: result.fractureDelta,
    }),
    pendingRedInk: result.createdRedInkOffer
      ? createTutorialRedInkOffer(run)
      : undefined,
    events: {
      completedEventIds: addUniqueEventId(run.events.completedEventIds, event.id),
      records: [...run.events.records, record],
    },
  }
}

function everyRequiredStageUnlocked(option: EventOptionDefinition, run: TutorialRunState) {
  return (option.requiredUnlockStages ?? []).every((stageId) =>
    run.unlocks.stages.includes(stageId),
  )
}

function isEventEffectAvailable(effect: EventEffect, run: TutorialRunState) {
  if (effect.type === 'SPEND_INK') {
    return canSpendTutorialResources(run.resources, {
      ink: -effect.amount,
    })
  }

  if (effect.type !== 'REMOVE_CARD') {
    return true
  }

  return run.deckCards.some(
    (card) => !effect.cardDefinitionId || card.definitionId === effect.cardDefinitionId,
  )
}

interface EventEffectResult {
  readonly deckDefinitionIds: readonly CardId[]
  readonly deckCards: TutorialRunState['deckCards']
  readonly addedCardDefinitionIds: readonly CardId[]
  readonly addedIncenseSealDefinitionIds: readonly IncenseSealId[]
  readonly removedDeckCardIds: readonly RunDeckCardId[]
  readonly removedCardDefinitionIds: readonly CardId[]
  readonly inkDelta: number
  readonly doomDelta: number
  readonly fractureDelta: number
  readonly createdRedInkOffer: boolean
}

function applyEventEffects(
  run: TutorialRunState,
  effects: readonly EventEffect[],
): EventEffectResult {
  let deckDefinitionIds = run.deckDefinitionIds
  let deckCards = run.deckCards
  const addedCardDefinitionIds: CardId[] = []
  const addedIncenseSealDefinitionIds: IncenseSealId[] = []
  const removedDeckCardIds: RunDeckCardId[] = []
  const removedCardDefinitionIds: CardId[] = []
  let inkDelta = 0
  let doomDelta = 0
  let fractureDelta = 0
  let createdRedInkOffer = false

  for (const effect of effects) {
    if (effect.type === 'ADD_CARD') {
      deckDefinitionIds = [...deckDefinitionIds, effect.cardDefinitionId]
      deckCards = appendRunDeckCard(deckCards, effect.cardDefinitionId)
      addedCardDefinitionIds.push(effect.cardDefinitionId)
    }

    if (effect.type === 'REMOVE_CARD') {
      const removal = removeFirstMatchingRunDeckCard(
        deckDefinitionIds,
        deckCards,
        effect.cardDefinitionId,
      )

      deckDefinitionIds = removal.deckDefinitionIds
      deckCards = removal.deckCards
      removedDeckCardIds.push(removal.removedDeckCardId)
      removedCardDefinitionIds.push(removal.removedCardDefinitionId)
    }

    if (effect.type === 'ADD_FRACTURE') {
      fractureDelta += effect.amount
    }

    if (effect.type === 'ADD_INK') {
      inkDelta += effect.amount
    }

    if (effect.type === 'SPEND_INK') {
      inkDelta -= effect.amount
    }

    if (effect.type === 'ADD_DOOM') {
      doomDelta += effect.amount
    }

    if (effect.type === 'CREATE_RED_INK_OFFER') {
      createdRedInkOffer = true
    }

    if (effect.type === 'ADD_INCENSE_SEAL') {
      addedIncenseSealDefinitionIds.push(effect.incenseSealDefinitionId)
    }
  }

  return {
    deckDefinitionIds,
    deckCards,
    addedCardDefinitionIds,
    addedIncenseSealDefinitionIds,
    removedDeckCardIds,
    removedCardDefinitionIds,
    inkDelta,
    doomDelta,
    fractureDelta,
    createdRedInkOffer,
  }
}

function addUniqueEventId(eventIds: readonly string[], eventId: string) {
  return eventIds.includes(eventId) ? eventIds : [...eventIds, eventId]
}
