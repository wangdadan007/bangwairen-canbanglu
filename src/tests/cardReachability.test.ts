import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  completeCurrentRouteNode,
  createInitialRouteState,
  createInitialTutorialRunState,
  createTutorialRewardOffer,
  createUnlockState,
  getAvailableEventOptions,
  getAvailableShopItems,
  getAvailableTutorialRewardCards,
  getCurrentRouteEvent,
  getRouteBattleEncounterIds,
  HENGJIAN_ROLE_ID,
  LIANJIN_ROLE_ID,
  PLAYABLE_ROLE_DEFINITIONS,
  selectReachableRouteNode,
  VERDICT_ERASE_HEAVY_REWARD_CARD_ID,
  VERDICT_ERASE_REWARD_CARD_ID,
  ZHAOWEI_ROLE_ID,
} from '../core'
import { gameData } from '../data'
import type {
  CardId,
  PlayableRoleId,
  RouteState,
  UnlockState,
  VictorySettlement,
} from '../types'

const ROLE_IDS = [
  undefined,
  HENGJIAN_ROLE_ID,
  ZHAOWEI_ROLE_ID,
  LIANJIN_ROLE_ID,
] as const satisfies readonly (PlayableRoleId | undefined)[]

const SETTLEMENTS = ['vanquish', 'catalogue'] as const satisfies readonly VictorySettlement[]
const ROUTE_EVENT_REACHABILITY_SEEDS = Array.from({ length: 80 }, (_, index) => index)

describe('T69 card reachability', () => {
  it('can show every reward-pool card in at least one actual reward offer', () => {
    const rewardPoolIds = collectRewardPoolCardIds()
    const offeredRewardIds = collectActualRewardOfferCardIds()
    const missingRewardIds = [...rewardPoolIds].filter((cardId) => !offeredRewardIds.has(cardId))

    expect(formatCardIds(missingRewardIds)).toEqual([])
  })

  it('keeps every non-temporary chapter-one card bound to a real acquisition channel', () => {
    const reachableCardIds = new Set<CardId>([
      ...collectStarterDeckCardIds(),
      ...collectActualRewardOfferCardIds(),
      ...collectDisplayedRouteEventAddedCardIds(),
      ...collectShopCardIds(),
      VERDICT_ERASE_REWARD_CARD_ID,
      VERDICT_ERASE_HEAVY_REWARD_CARD_ID,
    ])
    const missingCardIds = gameData.cards
      .filter((card) => card.type !== 'temporary')
      .map((card) => card.id)
      .filter((cardId) => !reachableCardIds.has(cardId))

    expect(formatCardIds(missingCardIds)).toEqual([])
  })
})

function collectRewardPoolCardIds(): Set<CardId> {
  const cardIds = new Set<CardId>()

  for (const unlocks of createCumulativeUnlockStates()) {
    for (const card of getAvailableTutorialRewardCards(gameData.cards, unlocks)) {
      cardIds.add(card.id)
    }
  }

  return cardIds
}

function collectActualRewardOfferCardIds(): Set<CardId> {
  const cardIds = new Set<CardId>()

  for (const unlocks of createCumulativeUnlockStates()) {
    for (const encounter of gameData.encounters) {
      for (const settlement of SETTLEMENTS) {
        for (const roleId of ROLE_IDS) {
          const offer = createTutorialRewardOffer({
            encounter,
            settlement,
            unlocks,
            cardDefinitions: gameData.cards,
            roleId,
          })

          for (const option of offer.options) {
            cardIds.add(option.cardDefinitionId)
          }
        }
      }
    }
  }

  return cardIds
}

function createCumulativeUnlockStates(): readonly UnlockState[] {
  return gameData.tutorialUnlocks.map((_, index) =>
    createUnlockState(
      gameData.tutorialUnlocks.slice(0, index + 1).map((unlock) => unlock.id),
      gameData.tutorialUnlocks,
    ),
  )
}

function collectStarterDeckCardIds(): Set<CardId> {
  return new Set(PLAYABLE_ROLE_DEFINITIONS.flatMap((role) => role.starterDeckDefinitionIds))
}

function collectDisplayedRouteEventAddedCardIds(): Set<CardId> {
  const cardIds = new Set<CardId>()

  for (const seed of ROUTE_EVENT_REACHABILITY_SEEDS) {
    for (const scenario of createRouteEventScenarios(seed)) {
      const event = getCurrentRouteEvent(scenario.node, gameData.events, scenario.run, scenario.routeState)

      if (!event) {
        continue
      }

      for (const option of getAvailableEventOptions(event, scenario.run)) {
        for (const effect of option.effects) {
          if (effect.type === 'ADD_CARD') {
            cardIds.add(effect.cardDefinitionId)
          }
        }
      }
    }
  }

  return cardIds
}

function collectShopCardIds(): Set<CardId> {
  const cardIds = new Set<CardId>()
  const shopNodes = gameData.routes.flatMap((route) =>
    route.nodes.filter((node) => node.type === 'shop').map((node) => ({ route, node })),
  )

  for (const roleId of ROLE_IDS) {
    for (const unlocks of createCumulativeUnlockStates()) {
      const run = {
        ...createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          undefined,
          undefined,
          gameData.artifacts,
          roleId,
        ),
        unlocks,
      }

      for (const { route, node } of shopNodes) {
        const items = getAvailableShopItems(
          run,
          gameData.shopItems,
          gameData.cards,
          gameData.artifacts,
          {
            routeNodeId: node.id,
            routeSeed: route.id,
            routeTendencyIds: node.routeTendencyIds,
            incenseSealDefinitions: gameData.incenseSeals,
          },
        )

        for (const item of items) {
          if (item.kind === 'card' && item.cardDefinitionId) {
            cardIds.add(item.cardDefinitionId)
          }
        }
      }
    }
  }

  return cardIds
}

function createRouteEventScenarios(seed: number) {
  const route = gameData.routes[0]
  const firstChoice = completeCurrentRouteNode(
    route,
    completeCurrentRouteNode(
      route,
      completeCurrentRouteNode(route, createInitialRouteState(route, seed)),
    ),
  )
  const catalogueEventState = selectReachableRouteNode(
    route,
    completeCurrentRouteNode(
      route,
      selectReachableRouteNode(route, firstChoice, 'route_node_first_elite'),
    ),
    'route_node_mid_event',
  )
  const fractureChoiceState = completeCurrentRouteNode(
    route,
    selectReachableRouteNode(route, firstChoice, 'route_node_fracture_fortune_breaker'),
  )
  const firstEventState = selectReachableRouteNode(
    route,
    fractureChoiceState,
    'route_node_first_event',
  )
  const lateEventState = completeCurrentRouteNode(
    route,
    completeCurrentRouteNode(
      route,
      selectReachableRouteNode(
        route,
        fractureChoiceState,
        'route_node_late_scroll_stuffer_clerk',
      ),
    ),
  )

  return [
    createRouteEventScenario(catalogueEventState, 4),
    createRouteEventScenario(firstEventState, 4),
    createRouteEventScenario(lateEventState, 5),
  ]
}

function createRouteEventScenario(routeState: RouteState, completedBattleCount: number) {
  const route = gameData.routes[0]
  const run = getRouteBattleEncounterIds(route, routeState)
    .slice(0, completedBattleCount)
    .reduce(
      (currentRun) =>
        advanceTutorialRun(
          currentRun,
          gameData.encounters,
          gameData.tutorialUnlocks,
          'vanquish',
        ),
      createInitialTutorialRunState(
        gameData.tutorialUnlocks,
        getRouteBattleEncounterIds(route, routeState),
      ),
    )

  return {
    node: route.nodes.find((candidate) => candidate.id === routeState.currentNodeId),
    routeState,
    run,
  }
}

function formatCardIds(cardIds: readonly CardId[]): readonly string[] {
  return cardIds.map((cardId) => {
    const card = gameData.cards.find((candidate) => candidate.id === cardId)
    const name = card ? gameData.localization[card.nameKey] : undefined

    return name ? `${cardId} (${name})` : cardId
  })
}
