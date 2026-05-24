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
  PlayableRoleId,
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
  'linzhao',
  'red_ink_preview',
  'ink',
  'doom',
  'fracture',
  'altar',
  'human_altar',
  'earth_altar',
  'heaven_altar',
  'artifact',
])

export interface CreateTutorialRewardOfferInput {
  readonly encounter: EncounterDefinition
  readonly settlement: VictorySettlement
  readonly unlocks: UnlockState
  readonly cardDefinitions: readonly CardDefinition[]
  readonly roleId?: PlayableRoleId
}

export function createTutorialRewardOffer({
  encounter,
  settlement,
  unlocks,
  cardDefinitions,
  roleId,
}: CreateTutorialRewardOfferInput): TutorialRewardOffer {
  const quality = getRewardQuality(settlement)
  const options = selectRewardOptions({
    encounter,
    quality,
    cards: getAvailableTutorialRewardCards(cardDefinitions, unlocks),
    unlocks,
    roleId,
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
): readonly CardDefinition[] {
  return cardDefinitions.filter((card) => {
    if (!card.tags.includes('reward')) {
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
  roleId,
}: {
  readonly encounter: EncounterDefinition
  readonly quality: RewardQuality
  readonly cards: readonly CardDefinition[]
  readonly unlocks: UnlockState
  readonly roleId?: PlayableRoleId
}): readonly TutorialRewardOption[] {
  const latestStageId = unlocks.stages[unlocks.stages.length - 1]
  const latestStageCards = latestStageId
    ? cards.filter((card) => card.unlockStage === latestStageId)
    : []
  const orderedCards = uniqueCards([
    ...sortCardsByRolePreference(latestStageCards, roleId),
    ...sortCardsByRolePreference(cards, roleId),
  ])
  const optionCount = 3
  const rotatedCards = rotateRewardCandidates({
    cards: orderedCards,
    fixedHeadCount: 1,
    offsetSeed: `${encounter.id}:${latestStageId ?? 'none'}:${roleId ?? 'default'}`,
  })

  return rotatedCards.slice(0, optionCount).map((card, index) => ({
    id: `${encounter.id}_${quality}_${index + 1}_${card.id}`,
    type: 'card',
    cardDefinitionId: card.id,
    quality,
  }))
}

const ROLE_REWARD_TAG_WEIGHTS: Record<PlayableRoleId, Readonly<Record<string, number>>> = {
  role_hengjian: {
    catalogue_reward: 6,
    red_ink_preview: 5,
    whip: 4,
    judgement: 4,
    formation: 3,
    draw: 3,
    ask_name: 2,
    ink: 2,
    seal_momentum: 1,
  },
  role_zhaowei: {
    ask_name: 6,
    thunder: 5,
    whip: 4,
    break_form: 3,
    counter_abnormal_move: 4,
    abnormal_move: 4,
    formation: 1,
    incoming_force: 3,
    heaven_altar: 1,
    draw: 2,
    ink: 1,
  },
  role_lianjin: {
    break_form: 6,
    fire: 5,
    thunder: 4,
    gain_incense: 4,
    judgement: 3,
    doom: 3,
    fracture: 3,
    artifact: 2,
    seal_momentum: 1,
  },
}

function sortCardsByRolePreference(
  cards: readonly CardDefinition[],
  roleId?: PlayableRoleId,
): readonly CardDefinition[] {
  const weights = roleId ? ROLE_REWARD_TAG_WEIGHTS[roleId] : undefined

  if (!weights) {
    return cards
  }

  return cards
    .map((card, index) => ({
      card,
      index,
      score: card.tags.reduce((total, tag) => total + (weights[tag] ?? 0), 0),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ card }) => card)
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

function rotateRewardCandidates({
  cards,
  fixedHeadCount,
  offsetSeed,
}: {
  readonly cards: readonly CardDefinition[]
  readonly fixedHeadCount: number
  readonly offsetSeed: string
}): readonly CardDefinition[] {
  if (cards.length <= fixedHeadCount + 1) {
    return cards
  }

  const fixedHead = cards.slice(0, fixedHeadCount)
  const rotatableTail = cards.slice(fixedHeadCount)
  const offset = getStableOffset(offsetSeed, rotatableTail.length)

  return [
    ...fixedHead,
    ...rotatableTail.slice(offset),
    ...rotatableTail.slice(0, offset),
  ]
}

function getStableOffset(seed: string, modulo: number): number {
  if (modulo <= 1) {
    return 0
  }

  let hash = 0

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647
  }

  return hash % modulo
}
