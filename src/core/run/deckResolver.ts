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
  return [...deckCards, createUniqueRunDeckCard(deckCards, definitionId)]
}

export function normalizeRunDeckCards(
  deckCards: readonly RunDeckCard[],
): readonly RunDeckCard[] {
  const normalizedCards: RunDeckCard[] = []

  for (const card of deckCards) {
    if (!normalizedCards.some((candidate) => candidate.id === card.id)) {
      normalizedCards.push(card)
      continue
    }

    normalizedCards.push({
      ...card,
      id: createUniqueRunDeckCard(normalizedCards, card.definitionId).id,
    })
  }

  return normalizedCards
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

export interface RemoveRunDeckCardResult {
  readonly deckDefinitionIds: readonly CardId[]
  readonly deckCards: readonly RunDeckCard[]
  readonly removedDeckCardId: RunDeckCardId
  readonly removedCardDefinitionId: CardId
}

export function removeRunDeckCard(
  deckDefinitionIds: readonly CardId[],
  deckCards: readonly RunDeckCard[],
  deckCardId: RunDeckCardId,
): RemoveRunDeckCardResult {
  const cardIndex = deckCards.findIndex((card) => card.id === deckCardId)

  if (cardIndex < 0) {
    throw new Error(`Missing run deck card for removal: ${deckCardId}`)
  }

  const removedCard = deckCards[cardIndex]
  return removeRunDeckCardAtIndex(deckDefinitionIds, deckCards, cardIndex, removedCard.definitionId)
}

export function removeFirstMatchingRunDeckCard(
  deckDefinitionIds: readonly CardId[],
  deckCards: readonly RunDeckCard[],
  cardDefinitionId?: CardId,
): RemoveRunDeckCardResult {
  const cardIndex = deckCards.findIndex(
    (card) => !cardDefinitionId || card.definitionId === cardDefinitionId,
  )

  if (cardIndex < 0) {
    throw new Error(`No run deck card is available for removal: ${cardDefinitionId ?? 'any'}`)
  }

  const removedCard = deckCards[cardIndex]
  return removeRunDeckCardAtIndex(deckDefinitionIds, deckCards, cardIndex, removedCard.definitionId)
}

function removeRunDeckCardAtIndex(
  deckDefinitionIds: readonly CardId[],
  deckCards: readonly RunDeckCard[],
  cardIndex: number,
  removedCardDefinitionId: CardId,
): RemoveRunDeckCardResult {
  const removedCard = deckCards[cardIndex]
  const definitionIndex = deckDefinitionIds.findIndex(
    (candidate) => candidate === removedCardDefinitionId,
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
    removedCardDefinitionId,
  }
}

function createUniqueRunDeckCard(
  deckCards: readonly RunDeckCard[],
  definitionId: CardId,
): RunDeckCard {
  let nextIndex = getNextRunDeckCardIndex(deckCards)
  let nextCard = createRunDeckCard(definitionId, nextIndex)

  while (deckCards.some((card) => card.id === nextCard.id)) {
    nextIndex += 1
    nextCard = createRunDeckCard(definitionId, nextIndex)
  }

  return nextCard
}

function getNextRunDeckCardIndex(deckCards: readonly RunDeckCard[]): number {
  const maxExistingIndex = deckCards.reduce((maxIndex, card) => {
    const match = /^run_card_(\d+)_/.exec(card.id)
    const parsedIndex = match ? Number.parseInt(match[1], 10) - 1 : Number.NaN

    return Number.isFinite(parsedIndex) ? Math.max(maxIndex, parsedIndex) : maxIndex
  }, -1)

  return maxExistingIndex + 1
}
