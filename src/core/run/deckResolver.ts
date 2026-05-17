import type { CardAnnotation, CardId, RunDeckCard, RunDeckCardId } from '../../types'

export function createRunDeckCards(deckDefinitionIds: readonly CardId[]): readonly RunDeckCard[] {
  return deckDefinitionIds.map((definitionId, index) => createRunDeckCard(definitionId, index))
}

export function createRunDeckCard(definitionId: CardId, index: number): RunDeckCard {
  return {
    id: `run_card_${(index + 1).toString().padStart(3, '0')}_${definitionId}`,
    definitionId,
    annotations: [],
  }
}

export function appendRunDeckCard(
  deckCards: readonly RunDeckCard[],
  definitionId: CardId,
): readonly RunDeckCard[] {
  return [...deckCards, createRunDeckCard(definitionId, deckCards.length)]
}

export function annotateRunDeckCard(
  deckCards: readonly RunDeckCard[],
  deckCardId: RunDeckCardId,
  annotation: CardAnnotation,
): readonly RunDeckCard[] {
  return deckCards.map((card) =>
    card.id === deckCardId
      ? {
          ...card,
          annotations: card.annotations.some((candidate) => candidate.id === annotation.id)
            ? card.annotations
            : [...card.annotations, annotation],
        }
      : card,
  )
}
