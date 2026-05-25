import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  completeCurrentRouteNode,
  createInitialRouteState,
  createInitialTutorialRunState,
  getAvailableEventOptions,
  getCurrentRouteEvent,
  getRouteEventCandidates,
  getRouteBattleEncounterIds,
  selectReachableRouteNode,
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

    const resourceRun = createResourceRun()

    expect(getRouteEventCandidates(eventNode, gameData.events, resourceRun).map((event) => event.id)).toEqual([
      'event_mid_ink_pool',
      'event_abandoned_registry_desk',
      'event_ash_altar_lamp',
      'event_cinnabar_scribe',
      'event_cracked_registry_needle',
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
        inkDelta: 0,
        doomDelta: 0,
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

    expect(fractureRun.resources.fracture).toBe(abnormalRun.resources.fracture + 1)
    expect(fractureRun.deckDefinitionIds).toContain('card_thunder_splinter')
    expect(fractureRun.events.records[0].fractureDelta).toBe(1)
    expect(getAvailableEventOptions(cinnabarEvent, coreRun)).toHaveLength(0)
    expect(redInkServiceRun.pendingRedInk?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'red_ink_return_incense',
        'red_ink_trace_name',
        'red_ink_named_draw',
        'red_ink_press_momentum',
      ]),
    )
    expect(redInkServiceRun.events.records[0].createdRedInkOffer).toBe(true)
  })

  it('applies T23 ink and doom event resource choices with spend filtering', () => {
    const resourceRun = createResourceRun()
    const inkEvent = gameData.events.find((event) => event.id === 'event_mid_ink_pool')

    if (!inkEvent) {
      throw new Error('Missing event_mid_ink_pool')
    }

    expect(getAvailableEventOptions(inkEvent, resourceRun).map((option) => option.id)).toEqual([
      'event_mid_ink_pool_grind_ink',
      'event_mid_ink_pool_borrow_doom',
    ])

    const inkRun = resolveTutorialEvent(resourceRun, inkEvent, 'event_mid_ink_pool_grind_ink')
    const doomRun = resolveTutorialEvent(resourceRun, inkEvent, 'event_mid_ink_pool_borrow_doom')
    const inkReadyRun = {
      ...resourceRun,
      resources: {
        ...resourceRun.resources,
        ink: 1,
      },
    }
    const redInkRun = resolveTutorialEvent(
      inkReadyRun,
      inkEvent,
      'event_mid_ink_pool_spend_ink_red_ink',
    )

    expect(inkRun.resources.ink).toBe(resourceRun.resources.ink + 2)
    expect(inkRun.events.records[0]).toEqual(
      expect.objectContaining({
        inkDelta: 2,
        doomDelta: 0,
        fractureDelta: 0,
      }),
    )
    expect(doomRun.resources.doom).toBe(resourceRun.resources.doom + 1)
    expect(doomRun.deckDefinitionIds).toContain('card_borrowed_doom_talisman')
    expect(doomRun.events.records[0]).toEqual(
      expect.objectContaining({
        addedCardDefinitionIds: ['card_borrowed_doom_talisman'],
        doomDelta: 1,
      }),
    )
    expect(getAvailableEventOptions(inkEvent, inkReadyRun).map((option) => option.id)).toContain(
      'event_mid_ink_pool_spend_ink_red_ink',
    )
    expect(redInkRun.resources.ink).toBe(0)
    expect(redInkRun.pendingRedInk).toBeDefined()
    expect(redInkRun.events.records[0]).toEqual(
      expect.objectContaining({
        inkDelta: -1,
        createdRedInkOffer: true,
      }),
    )
  })

  it('offers T36 mid and late event pools with readable resource feedback records', () => {
    const resourceRun = createResourceRun()
    const midEventNode = route.nodes.find((node) => node.id === 'route_node_mid_event')
    const lateEventNode = route.nodes.find((node) => node.id === 'route_node_late_event')

    expect(getRouteEventCandidates(midEventNode, gameData.events, resourceRun).map((event) => event.id)).toEqual([
      'event_mid_ink_pool',
      'event_cracked_registry_needle',
      'event_lost_altar_bell',
      'event_bound_artifact_case',
    ])
    expect(getRouteEventCandidates(lateEventNode, gameData.events, resourceRun).map((event) => event.id)).toEqual([
      'event_cracked_registry_needle',
      'event_lost_altar_bell',
      'event_bound_artifact_case',
      'event_fouled_page_bundle',
      'event_covered_name_stable',
    ])

    const crackedNeedle = gameData.events.find((event) => event.id === 'event_cracked_registry_needle')
    const coveredStable = gameData.events.find((event) => event.id === 'event_covered_name_stable')

    if (!crackedNeedle || !coveredStable) {
      throw new Error('Missing T36 event definitions')
    }

    const splinterRun = resolveTutorialEvent(
      resourceRun,
      crackedNeedle,
      'event_cracked_registry_needle_take_splinter',
    )
    const nameNetRun = resolveTutorialEvent(
      resourceRun,
      coveredStable,
      'event_covered_name_stable_take_name_net',
    )

    expect(splinterRun.deckDefinitionIds).toContain('card_registry_splinter')
    expect(splinterRun.resources.fracture).toBe(resourceRun.resources.fracture + 1)
    expect(splinterRun.events.records[0]).toEqual(
      expect.objectContaining({
        eventId: 'event_cracked_registry_needle',
        addedCardDefinitionIds: ['card_registry_splinter'],
        fractureDelta: 1,
      }),
    )
    expect(nameNetRun.deckDefinitionIds).toContain('card_name_net_talisman')
    expect(nameNetRun.events.records[0].addedCardDefinitionIds).toEqual([
      'card_name_net_talisman',
    ])
  })

  it('can surface the bound artifact event on a seeded real route event node', () => {
    const seededRouteState = createFractureLateEventRouteState()
    const lateEventNode = route.nodes.find((node) => node.id === seededRouteState.currentNodeId)
    const run = createRunAfterRouteBattles(seededRouteState, 5)
    const event = getCurrentRouteEvent(lateEventNode, gameData.events, run, seededRouteState)

    if (!event) {
      throw new Error('Missing seeded route event')
    }

    const addedCardIds = getAvailableEventOptions(event, run).flatMap((option) =>
      option.effects.flatMap((effect) =>
        effect.type === 'ADD_CARD' ? [effect.cardDefinitionId] : [],
      ),
    )

    expect(event.id).toBe('event_bound_artifact_case')
    expect(addedCardIds).toContain('card_artifact_polish_slip')
    expect(event.options[0].flags).toContain('artifact')

    const signalRun = resolveTutorialEvent(run, event, 'event_bound_artifact_case_polish')

    expect(signalRun.events.records[0]).toEqual(
      expect.objectContaining({
        artifactSignalKey: 'event.bound_artifact_case.signal.polish',
      }),
    )
  })
})

function createResourceRun() {
  const firstRun = createInitialTutorialRunState(
    gameData.tutorialUnlocks,
    getRouteBattleEncounterIds(route),
  )
  const secondRun = advanceTutorialRun(
    firstRun,
    gameData.encounters,
    gameData.tutorialUnlocks,
    'vanquish',
  )
  const thirdRun = advanceTutorialRun(
    secondRun,
    gameData.encounters,
    gameData.tutorialUnlocks,
    'vanquish',
  )
  const fourthRun = advanceTutorialRun(
    thirdRun,
    gameData.encounters,
    gameData.tutorialUnlocks,
    'vanquish',
  )

  return advanceTutorialRun(
    fourthRun,
    gameData.encounters,
    gameData.tutorialUnlocks,
    'vanquish',
  )
}

function createFractureLateEventRouteState() {
  const firstChoice = completeCurrentRouteNode(
    route,
    completeCurrentRouteNode(
      route,
      completeCurrentRouteNode(route, createInitialRouteState(route, 7)),
    ),
  )
  const fractureChoice = completeCurrentRouteNode(
    route,
    selectReachableRouteNode(route, firstChoice, 'route_node_fracture_fortune_breaker'),
  )
  const fractureRest = completeCurrentRouteNode(
    route,
    selectReachableRouteNode(
      route,
      fractureChoice,
      'route_node_first_event',
    ),
  )
  const altarPressure = completeCurrentRouteNode(route, fractureRest)
  const fouledPressure = completeCurrentRouteNode(route, altarPressure)
  const namePressure = completeCurrentRouteNode(route, fouledPressure)

  return completeCurrentRouteNode(route, namePressure)
}

function createRunAfterRouteBattles(routeState: ReturnType<typeof createInitialRouteState>, battleCount: number) {
  const encounterIds = getRouteBattleEncounterIds(route, routeState)

  return encounterIds.slice(0, battleCount).reduce(
    (currentRun) =>
      advanceTutorialRun(
        currentRun,
        gameData.encounters,
        gameData.tutorialUnlocks,
        'vanquish',
      ),
    createInitialTutorialRunState(gameData.tutorialUnlocks, encounterIds),
  )
}
