import rawCards from './cards.json'
import rawEnemies from './enemies.json'
import rawTutorialUnlocks from './tutorial_unlocks.json'
import rawZhCn from './localization/zh-CN.json'
import type { CardDefinition, EnemyDefinition, LocalizationKey } from '../types'

export interface TutorialUnlockDefinition {
  readonly id: string
  readonly nameKey: LocalizationKey
  readonly keywords: readonly string[]
}

export interface GameData {
  readonly cards: readonly CardDefinition[]
  readonly enemies: readonly EnemyDefinition[]
  readonly tutorialUnlocks: readonly TutorialUnlockDefinition[]
  readonly localization: Readonly<Record<LocalizationKey, string>>
}

const cards = rawCards as readonly CardDefinition[]
const enemies = rawEnemies as readonly EnemyDefinition[]
const tutorialUnlocks = rawTutorialUnlocks as readonly TutorialUnlockDefinition[]
const zhCn = rawZhCn as Readonly<Record<LocalizationKey, string>>

export function loadGameData(): GameData {
  assertUniqueIds(cards, 'card')
  assertUniqueIds(enemies, 'enemy')
  assertUniqueIds(tutorialUnlocks, 'tutorial unlock')

  return {
    cards,
    enemies,
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

function assertUniqueIds(items: readonly { readonly id: string }[], label: string) {
  const seen = new Set<string>()

  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate ${label} id: ${item.id}`)
    }

    seen.add(item.id)
  }
}

export const gameData = loadGameData()
