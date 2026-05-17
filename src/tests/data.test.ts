import { describe, expect, it } from 'vitest'
import { getCardDefinition, getEnemyDefinition, loadGameData } from '../data'

describe('initial game data', () => {
  it('loads starter cards, tutorial enemy, unlocks, and localization', () => {
    const data = loadGameData()

    expect(data.cards).toHaveLength(6)
    expect(data.enemies).toHaveLength(1)
    expect(data.tutorialUnlocks).toHaveLength(1)
    expect(data.localization['card.zhu_fu.name']).toBe('朱符')
  })

  it('keeps ids unique', () => {
    const data = loadGameData()

    expect(new Set(data.cards.map((card) => card.id)).size).toBe(data.cards.length)
    expect(new Set(data.enemies.map((enemy) => enemy.id)).size).toBe(data.enemies.length)
    expect(new Set(data.tutorialUnlocks.map((unlock) => unlock.id)).size).toBe(
      data.tutorialUnlocks.length,
    )
  })

  it('contains the six starter cards and paper wraith baseline', () => {
    const data = loadGameData()

    expect(getCardDefinition('card_zhu_fu', data)?.cost).toBe(1)
    expect(getCardDefinition('card_ask_name', data)?.effects[0].type).toBe('ASK_NAME')
    expect(getCardDefinition('card_guard_desk_talisman', data)?.effects[0].type).toBe(
      'SEAL_MOMENTUM',
    )
    expect(getCardDefinition('card_mark_forehead', data)?.effects.map((effect) => effect.type)).toEqual([
      'BREAK_SHAPE',
      'ASK_NAME',
    ])
    expect(getCardDefinition('card_order_scroll', data)?.effects[0].type).toBe('DRAW')
    expect(getCardDefinition('card_quiet_incense', data)?.effects[0].type).toBe('GAIN_INCENSE')

    const paperWraith = getEnemyDefinition('enemy_paper_wraith', data)
    expect(paperWraith?.maxForm).toBe(18)
    expect(paperWraith?.nameSlots).toBe(2)
    expect(paperWraith?.intents[0].kind).toBe('incoming_force')
  })

  it('keeps logical object keys ASCII-only while allowing localized values', () => {
    const data = loadGameData()

    expect(hasNonAsciiKey(data.cards)).toBe(false)
    expect(hasNonAsciiKey(data.enemies)).toBe(false)
    expect(hasNonAsciiKey(data.tutorialUnlocks)).toBe(false)
  })
})

function hasNonAsciiKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasNonAsciiKey(item))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, nestedValue]) => /[^\u0000-\u007f]/.test(key) || hasNonAsciiKey(nestedValue),
    )
  }

  return false
}
