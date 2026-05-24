import { describe, expect, it } from 'vitest'
import {
  appendRunDeckCard,
  createRunDeckCards,
  normalizeRunDeckCards,
  removeRunDeckCard,
} from '../core'

describe('run deck card ids', () => {
  it('keeps appended card ids unique after a card has been removed', () => {
    const deckDefinitionIds = ['card_zhu_fu', 'card_heaven_altar_oracle'] as const
    const deckCards = createRunDeckCards(deckDefinitionIds)
    const removal = removeRunDeckCard(deckDefinitionIds, deckCards, deckCards[0].id)
    const nextDeckCards = appendRunDeckCard(
      removal.deckCards,
      'card_heaven_altar_oracle',
    )
    const ids = nextDeckCards.map((card) => card.id)

    expect(ids).toEqual([
      'run_card_002_card_heaven_altar_oracle',
      'run_card_003_card_heaven_altar_oracle',
    ])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('repairs duplicate ids when normalizing saved deck cards', () => {
    const deckCards = createRunDeckCards([
      'card_zhu_fu',
      'card_heaven_altar_oracle',
    ])
    const duplicatedDeckCards = [
      ...deckCards,
      {
        ...deckCards[1],
      },
    ]
    const normalizedDeckCards = normalizeRunDeckCards(duplicatedDeckCards)
    const ids = normalizedDeckCards.map((card) => card.id)

    expect(ids).toEqual([
      'run_card_001_card_zhu_fu',
      'run_card_002_card_heaven_altar_oracle',
      'run_card_003_card_heaven_altar_oracle',
    ])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
