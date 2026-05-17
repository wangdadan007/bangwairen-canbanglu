import type {
  CardDefinition,
  CardId,
  EncounterDefinition,
  RewardQuality,
  TutorialRewardOffer,
  TutorialRewardOption,
  TutorialRewardRecord,
  TutorialRunState,
  UnlockState,
  VictorySettlement,
} from '../../types'
import { appendRunDeckCard } from './deckResolver'

const MECHANIC_TAGS = new Set([
  'break_form',
  'ask_name',
  'seal_momentum',
  'counter_abnormal_move',
  'incoming_force',
  'abnormal_move',
  'draw',
  'gain_incense',
  'red_ink_preview',
])

export interface CreateTutorialRewardOfferInput {
  readonly encounter: EncounterDefinition
  readonly settlement: VictorySettlement
  readonly unlocks: UnlockState
  readonly cardDefinitions: readonly CardDefinition[]
}

export function createTutorialRewardOffer({
  encounter,
  settlement,
  unlocks,
  cardDefinitions,
}: CreateTutorialRewardOfferInput): TutorialRewardOffer {
  const quality = getRewardQuality(settlement)
  const options = selectRewardOptions({
    encounter,
    quality,
    cards: getAvailableTutorialRewardCards(cardDefinitions, unlocks, quality),
    unlocks,
  })

  return {
    encounterId: encounter.id,
    settlement,
    quality,
    options,
  }
}

export function getAvailableTutorialRewardCards(
  cardDefinitions: readonly CardDefinition[],
  unlocks: UnlockState,
  quality: RewardQuality,
): readonly CardDefinition[] {
  return cardDefinitions.filter((card) => {
    if (!card.tags.includes('reward')) {
      return false
    }

    if (quality === 'ordinary' && card.tags.includes('catalogue_reward')) {
      return false
    }

    return isCardUnlockedForReward(card, unlocks)
  })
}

export function isCardUnlockedForReward(card: CardDefinition, unlocks: UnlockState): boolean {
  if (!unlocks.stages.includes(card.unlockStage)) {
    return false
  }

  return card.tags.every((tag) => !MECHANIC_TAGS.has(tag) || unlocks.keywords.includes(tag))
}

export function resolveTutorialReward(
  run: TutorialRunState,
  selectedCardDefinitionId?: CardId,
): TutorialRunState {
  const offer = run.pendingReward

  if (!offer) {
    return run
  }

  const rewardRecord = createTutorialRewardRecord(offer, selectedCardDefinitionId)

  return {
    ...run,
    deckDefinitionIds: selectedCardDefinitionId
      ? [...run.deckDefinitionIds, selectedCardDefinitionId]
      : run.deckDefinitionIds,
    deckCards: selectedCardDefinitionId
      ? appendRunDeckCard(run.deckCards, selectedCardDefinitionId)
      : run.deckCards,
    pendingReward: undefined,
    rewards: [...run.rewards, rewardRecord],
  }
}

function createTutorialRewardRecord(
  offer: TutorialRewardOffer,
  selectedCardDefinitionId?: CardId,
): TutorialRewardRecord {
  if (
    selectedCardDefinitionId &&
    !offer.options.some((option) => option.cardDefinitionId === selectedCardDefinitionId)
  ) {
    throw new Error(`Reward option is not available: ${selectedCardDefinitionId}`)
  }

  return {
    encounterId: offer.encounterId,
    settlement: offer.settlement,
    quality: offer.quality,
    offeredCardDefinitionIds: offer.options.map((option) => option.cardDefinitionId),
    selectedCardDefinitionId,
    skipped: !selectedCardDefinitionId,
  }
}

function selectRewardOptions({
  encounter,
  quality,
  cards,
  unlocks,
}: {
  readonly encounter: EncounterDefinition
  readonly quality: RewardQuality
  readonly cards: readonly CardDefinition[]
  readonly unlocks: UnlockState
}): readonly TutorialRewardOption[] {
  const latestStageId = unlocks.stages[unlocks.stages.length - 1]
  const latestStageCards = latestStageId
    ? cards.filter((card) => card.unlockStage === latestStageId)
    : []
  const highQualityCards =
    quality === 'high' ? cards.filter((card) => card.tags.includes('catalogue_reward')) : []
  const orderedCards = uniqueCards([...latestStageCards, ...highQualityCards, ...cards])
  const optionCount = quality === 'high' ? 3 : 2

  return orderedCards.slice(0, optionCount).map((card, index) => ({
    id: `${encounter.id}_${quality}_${index + 1}_${card.id}`,
    type: 'card',
    cardDefinitionId: card.id,
    quality,
  }))
}

function getRewardQuality(settlement: VictorySettlement): RewardQuality {
  return settlement === 'catalogue' ? 'high' : 'ordinary'
}

function uniqueCards(cards: readonly CardDefinition[]): readonly CardDefinition[] {
  const seen = new Set<CardId>()
  const unique: CardDefinition[] = []

  for (const card of cards) {
    if (seen.has(card.id)) {
      continue
    }

    seen.add(card.id)
    unique.push(card)
  }

  return unique
}
