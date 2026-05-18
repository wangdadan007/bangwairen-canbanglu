import rawArtifacts from './artifacts.json'
import rawCards from './cards.json'
import rawEnemies from './enemies.json'
import rawEncounters from './encounters.json'
import rawEvents from './events.json'
import rawRoutes from './routes.json'
import rawShopItems from './shop_items.json'
import rawTutorialUnlocks from './tutorial_unlocks.json'
import rawZhCn from './localization/zh-CN.json'
import type {
  ArtifactDefinition,
  CardDefinition,
  EncounterDefinition,
  EnemyDefinition,
  EventDefinition,
  LocalizationKey,
  RouteDefinition,
  TutorialShopItemDefinition,
  TutorialUnlockDefinition,
} from '../types'

export interface GameData {
  readonly artifacts: readonly ArtifactDefinition[]
  readonly cards: readonly CardDefinition[]
  readonly enemies: readonly EnemyDefinition[]
  readonly encounters: readonly EncounterDefinition[]
  readonly events: readonly EventDefinition[]
  readonly routes: readonly RouteDefinition[]
  readonly shopItems: readonly TutorialShopItemDefinition[]
  readonly tutorialUnlocks: readonly TutorialUnlockDefinition[]
  readonly localization: Readonly<Record<LocalizationKey, string>>
}

const artifacts = rawArtifacts as readonly ArtifactDefinition[]
const cards = rawCards as readonly CardDefinition[]
const enemies = rawEnemies as readonly EnemyDefinition[]
const encounters = rawEncounters as readonly EncounterDefinition[]
const events = rawEvents as readonly EventDefinition[]
const routes = rawRoutes as readonly RouteDefinition[]
const shopItems = rawShopItems as readonly TutorialShopItemDefinition[]
const tutorialUnlocks = rawTutorialUnlocks as readonly TutorialUnlockDefinition[]
const zhCn = rawZhCn as Readonly<Record<LocalizationKey, string>>

export function loadGameData(): GameData {
  assertUniqueIds(artifacts, 'artifact')
  assertUniqueIds(cards, 'card')
  assertUniqueIds(enemies, 'enemy')
  assertUniqueIds(encounters, 'encounter')
  assertUniqueIds(events, 'event')
  assertUniqueIds(routes, 'route')
  assertUniqueIds(shopItems, 'shop item')
  assertEncounterEnemyIds(encounters, enemies)
  assertEventCardIds(events, cards)
  assertShopItemCardIds(shopItems, cards)
  assertRouteNodeIds(routes)
  assertRouteReferences(routes, encounters, events)
  assertUniqueIds(tutorialUnlocks, 'tutorial unlock')

  return {
    artifacts,
    cards,
    enemies,
    encounters,
    events,
    routes,
    shopItems,
    tutorialUnlocks,
    localization: zhCn,
  }
}

export function getArtifactDefinition(id: string, data: GameData = loadGameData()) {
  return data.artifacts.find((artifact) => artifact.id === id)
}

export function getCardDefinition(id: string, data: GameData = loadGameData()) {
  return data.cards.find((card) => card.id === id)
}

export function getEnemyDefinition(id: string, data: GameData = loadGameData()) {
  return data.enemies.find((enemy) => enemy.id === id)
}

export function getEncounterDefinition(id: string, data: GameData = loadGameData()) {
  return data.encounters.find((encounter) => encounter.id === id)
}

export function getEventDefinition(id: string, data: GameData = loadGameData()) {
  return data.events.find((event) => event.id === id)
}

export function getRouteDefinition(id: string, data: GameData = loadGameData()) {
  return data.routes.find((route) => route.id === id)
}

export function getShopItemDefinition(id: string, data: GameData = loadGameData()) {
  return data.shopItems.find((item) => item.id === id)
}

function assertUniqueIds(items: readonly { readonly id: string }[], label: string) {
  const seen = new Set<string>()

  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate ${label} id: ${item.id}`)
    }

    seen.add(item.id)
  }
}

function assertRouteNodeIds(routes: readonly RouteDefinition[]) {
  for (const route of routes) {
    assertUniqueIds(route.nodes, `${route.id} route node`)
  }
}

function assertEncounterEnemyIds(
  encounters: readonly EncounterDefinition[],
  enemies: readonly EnemyDefinition[],
) {
  const enemyIds = new Set(enemies.map((enemy) => enemy.id))

  for (const encounter of encounters) {
    if (!enemyIds.has(encounter.enemyDefinitionId)) {
      throw new Error(
        `Encounter ${encounter.id} references missing enemy ${encounter.enemyDefinitionId}`,
      )
    }
  }
}

function assertEventCardIds(
  events: readonly EventDefinition[],
  cards: readonly CardDefinition[],
) {
  const cardIds = new Set(cards.map((card) => card.id))

  for (const event of events) {
    for (const option of event.options) {
      for (const effect of option.effects) {
        if (effect.type === 'ADD_CARD' && !cardIds.has(effect.cardDefinitionId)) {
          throw new Error(
            `Event option ${option.id} references missing added card ${effect.cardDefinitionId}`,
          )
        }

        if (
          effect.type === 'REMOVE_CARD' &&
          effect.cardDefinitionId &&
          !cardIds.has(effect.cardDefinitionId)
        ) {
          throw new Error(
            `Event option ${option.id} references missing removed card ${effect.cardDefinitionId}`,
          )
        }
      }
    }
  }
}

function assertShopItemCardIds(
  shopItems: readonly TutorialShopItemDefinition[],
  cards: readonly CardDefinition[],
) {
  const cardIds = new Set(cards.map((card) => card.id))

  for (const item of shopItems) {
    if (item.cardDefinitionId && !cardIds.has(item.cardDefinitionId)) {
      throw new Error(`Shop item ${item.id} references missing card ${item.cardDefinitionId}`)
    }
  }
}

function assertRouteReferences(
  routes: readonly RouteDefinition[],
  encounters: readonly EncounterDefinition[],
  events: readonly EventDefinition[],
) {
  const encounterIds = new Set(encounters.map((encounter) => encounter.id))
  const eventIds = new Set(events.map((event) => event.id))

  for (const route of routes) {
    const nodeIds = new Set(route.nodes.map((node) => node.id))

    if (!nodeIds.has(route.startNodeId)) {
      throw new Error(`Route ${route.id} references missing start node ${route.startNodeId}`)
    }

    for (const node of route.nodes) {
      if (node.encounterId && !encounterIds.has(node.encounterId)) {
        throw new Error(`Route node ${node.id} references missing encounter ${node.encounterId}`)
      }

      for (const encounterId of node.encounterPoolIds ?? []) {
        if (!encounterIds.has(encounterId)) {
          throw new Error(`Route node ${node.id} references missing encounter pool item ${encounterId}`)
        }
      }

      for (const eventId of node.eventPoolIds ?? []) {
        if (!eventIds.has(eventId)) {
          throw new Error(`Route node ${node.id} references missing event ${eventId}`)
        }
      }

      for (const nextNodeId of node.nextNodeIds) {
        if (!nodeIds.has(nextNodeId)) {
          throw new Error(`Route node ${node.id} references missing next node ${nextNodeId}`)
        }
      }
    }
  }
}

export const gameData = loadGameData()
