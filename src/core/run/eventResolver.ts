import type {
  CardId,
  EventDefinition,
  EventEffect,
  EventOptionDefinition,
  RouteNodeDefinition,
  RunDeckCard,
  RunDeckCardId,
  TutorialEventRecord,
  TutorialEventState,
  TutorialRunState,
} from '../../types'
import { appendRunDeckCard } from './deckResolver'
import { RED_INK_OPTIONS } from './redInkResolver'

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
): EventDefinition | undefined {
  return getRouteEventCandidates(node, events, run)[0]
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

  if (run.pendingVerdict || run.pendingReward || run.pendingRedInk) {
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
    removedDeckCardIds: result.removedDeckCardIds,
    removedCardDefinitionIds: result.removedCardDefinitionIds,
    fractureDelta: result.fractureDelta,
    createdRedInkOffer: result.createdRedInkOffer,
  }

  return {
    ...run,
    deckDefinitionIds: result.deckDefinitionIds,
    deckCards: result.deckCards,
    verdict: {
      ...run.verdict,
      fracture: run.verdict.fracture + result.fractureDelta,
    },
    pendingRedInk: result.createdRedInkOffer
      ? {
          id: `red_ink_offer_${run.redInkRecords.length + 1}`,
          options: RED_INK_OPTIONS,
        }
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
  if (effect.type !== 'REMOVE_CARD') {
    return true
  }

  return run.deckCards.some(
    (card) => !effect.cardDefinitionId || card.definitionId === effect.cardDefinitionId,
  )
}

interface EventEffectResult {
  readonly deckDefinitionIds: readonly CardId[]
  readonly deckCards: readonly RunDeckCard[]
  readonly addedCardDefinitionIds: readonly CardId[]
  readonly removedDeckCardIds: readonly RunDeckCardId[]
  readonly removedCardDefinitionIds: readonly CardId[]
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
  const removedDeckCardIds: RunDeckCardId[] = []
  const removedCardDefinitionIds: CardId[] = []
  let fractureDelta = 0
  let createdRedInkOffer = false

  for (const effect of effects) {
    if (effect.type === 'ADD_CARD') {
      deckDefinitionIds = [...deckDefinitionIds, effect.cardDefinitionId]
      deckCards = appendRunDeckCard(deckCards, effect.cardDefinitionId)
      addedCardDefinitionIds.push(effect.cardDefinitionId)
    }

    if (effect.type === 'REMOVE_CARD') {
      const removal = removeFirstRunDeckCard(deckDefinitionIds, deckCards, effect.cardDefinitionId)

      deckDefinitionIds = removal.deckDefinitionIds
      deckCards = removal.deckCards
      removedDeckCardIds.push(removal.removedDeckCardId)
      removedCardDefinitionIds.push(removal.removedCardDefinitionId)
    }

    if (effect.type === 'ADD_FRACTURE') {
      fractureDelta += effect.amount
    }

    if (effect.type === 'CREATE_RED_INK_OFFER') {
      createdRedInkOffer = true
    }
  }

  return {
    deckDefinitionIds,
    deckCards,
    addedCardDefinitionIds,
    removedDeckCardIds,
    removedCardDefinitionIds,
    fractureDelta,
    createdRedInkOffer,
  }
}

function removeFirstRunDeckCard(
  deckDefinitionIds: readonly CardId[],
  deckCards: readonly RunDeckCard[],
  cardDefinitionId?: CardId,
) {
  const cardIndex = deckCards.findIndex(
    (card) => !cardDefinitionId || card.definitionId === cardDefinitionId,
  )

  if (cardIndex < 0) {
    throw new Error(`No run deck card is available for event removal: ${cardDefinitionId ?? 'any'}`)
  }

  const removedCard = deckCards[cardIndex]
  const definitionIndex = deckDefinitionIds.findIndex((candidate) =>
    cardDefinitionId ? candidate === cardDefinitionId : candidate === removedCard.definitionId,
  )

  return {
    deckDefinitionIds:
      definitionIndex >= 0
        ? [
            ...deckDefinitionIds.slice(0, definitionIndex),
            ...deckDefinitionIds.slice(definitionIndex + 1),
          ]
        : deckDefinitionIds,
    deckCards: [...deckCards.slice(0, cardIndex), ...deckCards.slice(cardIndex + 1)],
    removedDeckCardId: removedCard.id,
    removedCardDefinitionId: removedCard.definitionId,
  }
}

function addUniqueEventId(eventIds: readonly string[], eventId: string) {
  return eventIds.includes(eventId) ? eventIds : [...eventIds, eventId]
}
