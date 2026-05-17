import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialTutorialRunState,
  getAvailableEventOptions,
  getRouteEventCandidates,
  resolveTutorialEvent,
} from '../core'
import { gameData } from '../data'

const route = gameData.routes[0]
const eventNode = route.nodes.find((node) => node.id === 'route_node_first_event')

describe('T20 event resolver', () => {
  it('filters route event candidates by unlocked stages', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const abnormalRun = advanceTutorialRun(
      coreRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const redInkRun = advanceTutorialRun(
      abnormalRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    expect(getRouteEventCandidates(eventNode, gameData.events, coreRun).map((event) => event.id)).toEqual([
      'event_abandoned_registry_desk',
    ])
    expect(getRouteEventCandidates(eventNode, gameData.events, abnormalRun).map((event) => event.id)).toEqual([
      'event_abandoned_registry_desk',
      'event_ash_altar_lamp',
    ])
    expect(getRouteEventCandidates(eventNode, gameData.events, redInkRun).map((event) => event.id)).toEqual([
      'event_abandoned_registry_desk',
      'event_ash_altar_lamp',
      'event_cinnabar_scribe',
    ])
  })

  it('adds cards, removes cards, and records event choices', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const event = gameData.events.find((candidate) => candidate.id === 'event_abandoned_registry_desk')

    if (!event) {
      throw new Error('Missing event_abandoned_registry_desk')
    }

    const cardAddedRun = resolveTutorialEvent(
      run,
      event,
      'event_abandoned_registry_desk_take_trace_slip',
    )
    const cardRemovedRun = resolveTutorialEvent(
      run,
      event,
      'event_abandoned_registry_desk_burn_zhu_fu',
    )

    expect(cardAddedRun.deckDefinitionIds).toContain('card_trace_name_slip')
    expect(cardAddedRun.events.records[0]).toEqual(
      expect.objectContaining({
        eventId: event.id,
        optionId: 'event_abandoned_registry_desk_take_trace_slip',
        addedCardDefinitionIds: ['card_trace_name_slip'],
        fractureDelta: 0,
      }),
    )
    expect(
      cardRemovedRun.deckCards.some(
        (card) => card.id === cardRemovedRun.events.records[0].removedDeckCardIds[0],
      ),
    ).toBe(false)
    expect(cardRemovedRun.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu')).toHaveLength(
      run.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu').length - 1,
    )
    expect(cardRemovedRun.events.records[0].removedCardDefinitionIds).toEqual(['card_zhu_fu'])
  })

  it('applies fracture temptation and red ink service options', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const abnormalRun = advanceTutorialRun(
      coreRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const redInkRun = advanceTutorialRun(
      abnormalRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const ashEvent = gameData.events.find((event) => event.id === 'event_ash_altar_lamp')
    const cinnabarEvent = gameData.events.find((event) => event.id === 'event_cinnabar_scribe')

    if (!ashEvent || !cinnabarEvent) {
      throw new Error('Missing T20 event definitions')
    }

    const fractureRun = resolveTutorialEvent(
      abnormalRun,
      ashEvent,
      'event_ash_altar_lamp_crack_lamp',
    )
    const redInkServiceRun = resolveTutorialEvent(
      redInkRun,
      cinnabarEvent,
      'event_cinnabar_scribe_request_red_ink',
    )

    expect(fractureRun.verdict.fracture).toBe(abnormalRun.verdict.fracture + 1)
    expect(fractureRun.deckDefinitionIds).toContain('card_thunder_splinter')
    expect(fractureRun.events.records[0].fractureDelta).toBe(1)
    expect(getAvailableEventOptions(cinnabarEvent, coreRun)).toHaveLength(0)
    expect(redInkServiceRun.pendingRedInk?.options.map((option) => option.id)).toEqual([
      'red_ink_return_incense',
      'red_ink_trace_name',
    ])
    expect(redInkServiceRun.events.records[0].createdRedInkOffer).toBe(true)
  })
})
