import rawCards from './cards.json'
import rawEnemies from './enemies.json'
import rawEncounters from './encounters.json'
import rawRoutes from './routes.json'
import rawTutorialUnlocks from './tutorial_unlocks.json'
import rawZhCn from './localization/zh-CN.json'
import type {
  CardDefinition,
  EncounterDefinition,
  EnemyDefinition,
  LocalizationKey,
  RouteDefinition,
  TutorialUnlockDefinition,
} from '../types'

export interface GameData {
  readonly cards: readonly CardDefinition[]
  readonly enemies: readonly EnemyDefinition[]
  readonly encounters: readonly EncounterDefinition[]
  readonly routes: readonly RouteDefinition[]
  readonly tutorialUnlocks: readonly TutorialUnlockDefinition[]
  readonly localization: Readonly<Record<LocalizationKey, string>>
}

const cards = rawCards as readonly CardDefinition[]
const enemies = rawEnemies as readonly EnemyDefinition[]
const encounters = rawEncounters as readonly EncounterDefinition[]
const routes = rawRoutes as readonly RouteDefinition[]
const tutorialUnlocks = rawTutorialUnlocks as readonly TutorialUnlockDefinition[]
const zhCn = rawZhCn as Readonly<Record<LocalizationKey, string>>

export function loadGameData(): GameData {
  assertUniqueIds(cards, 'card')
  assertUniqueIds(enemies, 'enemy')
  assertUniqueIds(encounters, 'encounter')
  assertUniqueIds(routes, 'route')
  assertRouteNodeIds(routes)
  assertUniqueIds(tutorialUnlocks, 'tutorial unlock')

  return {
    cards,
    enemies,
    encounters,
    routes,
    tutorialUnlocks,
    localization: zhCn,
  }
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

export function getRouteDefinition(id: string, data: GameData = loadGameData()) {
  return data.routes.find((route) => route.id === id)
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

export const gameData = loadGameData()
