import type {
  CardRarity,
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
  readonly incenseMoneyReward?: number
  readonly unlocks: UnlockState
  readonly cardDefinitions: readonly CardDefinition[]
  readonly roleId?: PlayableRoleId
}

export function createTutorialRewardOffer({
  encounter,
  settlement,
  incenseMoneyReward = 0,
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
    incenseMoneyReward,
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
    incenseMoneyReward: offer.incenseMoneyReward,
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
  const seed = `${encounter.id}:${latestStageId ?? 'none'}:${roleId ?? 'default'}`
  const baseCards = cards.filter((card) => card.rarity !== 'rare')
  const tendencyCards = uniqueCards([
    ...sortCardsByRolePreference(latestStageCards, roleId),
    ...sortCardsByRolePreference(cards, roleId),
  ])
  const surpriseCards = getSurpriseRewardCandidates(cards, unlocks, encounter)
  const selectedCards = ensureBreakFormRewardOption({
    selectedCards: fillRewardSlots([
      pickFromSlot(tendencyCards, `${seed}:tendency`, roleId, 1),
      pickFromSlot(baseCards, `${seed}:base`, roleId, 0),
      pickFromSlot(surpriseCards, `${seed}:surprise`, roleId, 0),
    ], tendencyCards),
    breakFormCards: getBreakFormRewardCandidates(baseCards, cards),
    seed: `${seed}:break_form_floor`,
    roleId,
  })

  return selectedCards.slice(0, 3).map((card, index) => ({
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
    thunder: 6,
    whip: 5,
    break_form: 5,
    counter_abnormal_move: 4,
    abnormal_move: 4,
    formation: 2,
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

export function getRoleRewardTagScore(card: CardDefinition, roleId?: PlayableRoleId): number {
  const weights = roleId ? ROLE_REWARD_TAG_WEIGHTS[roleId] : undefined

  if (!weights) {
    return 0
  }

  return card.tags.reduce((total, tag) => total + (weights[tag] ?? 0), 0)
}

export function getCardRarityWeight(rarity: CardRarity): number {
  if (rarity === 'rare') {
    return 8
  }

  if (rarity === 'uncommon') {
    return 4
  }

  return 0
}

function getSurpriseRewardCandidates(
  cards: readonly CardDefinition[],
  unlocks: UnlockState,
  encounter: EncounterDefinition,
): readonly CardDefinition[] {
  const isEliteOrLate =
    encounter.id.startsWith('encounter_elite_') ||
    unlocks.stages.includes('stage_three_altars') ||
    unlocks.stages.includes('stage_run_resources')
  const allowedRarities: readonly CardRarity[] = isEliteOrLate
    ? ['rare', 'uncommon']
    : ['uncommon']
  const candidates = cards.filter(
    (card) => allowedRarities.includes(card.rarity) || isLateArtifactSupportCard(card, isEliteOrLate),
  )

  return candidates.length > 0 ? candidates : cards
}

function isLateArtifactSupportCard(card: CardDefinition, isEliteOrLate: boolean): boolean {
  return (
    isEliteOrLate &&
    card.rarity === 'common' &&
    card.tags.includes('artifact') &&
    (card.tags.includes('ink') || card.tags.includes('draw'))
  )
}

function getBreakFormRewardCandidates(
  baseCards: readonly CardDefinition[],
  cards: readonly CardDefinition[],
): readonly CardDefinition[] {
  const baseBreakFormCards = baseCards.filter(isBreakFormCard)

  return baseBreakFormCards.length > 0 ? baseBreakFormCards : cards.filter(isBreakFormCard)
}

function ensureBreakFormRewardOption({
  selectedCards,
  breakFormCards,
  seed,
  roleId,
}: {
  readonly selectedCards: readonly CardDefinition[]
  readonly breakFormCards: readonly CardDefinition[]
  readonly seed: string
  readonly roleId?: PlayableRoleId
}): readonly CardDefinition[] {
  if (selectedCards.some(isBreakFormCard) || breakFormCards.length === 0) {
    return selectedCards
  }

  const breakFormCard = pickFromSlot(breakFormCards, seed, roleId, 0)

  if (!breakFormCard) {
    return selectedCards
  }

  if (selectedCards.length === 0) {
    return [breakFormCard]
  }

  const replacementIndex = selectedCards.length > 1 ? 1 : 0
  const nextCards = selectedCards.map((card, index) =>
    index === replacementIndex ? breakFormCard : card,
  )

  return uniqueCards([...nextCards, ...selectedCards]).slice(0, 3)
}

function isBreakFormCard(card: CardDefinition): boolean {
  return card.tags.includes('break_form')
}

function pickFromSlot(
  cards: readonly CardDefinition[],
  seed: string,
  roleId?: PlayableRoleId,
  fixedHeadCount = 0,
): CardDefinition | undefined {
  const orderedCards = sortCardsByRolePreference(cards, roleId)
  const rotatedCards = rotateRewardCandidates({
    cards: orderedCards,
    fixedHeadCount: orderedCards.length > 2 ? fixedHeadCount : 0,
    offsetSeed: seed,
  })

  return rotatedCards[0]
}

function fillRewardSlots(
  preferredCards: readonly (CardDefinition | undefined)[],
  fallbackCards: readonly CardDefinition[],
): readonly CardDefinition[] {
  const selected = uniqueCards(preferredCards.filter((card): card is CardDefinition => Boolean(card)))

  if (selected.length >= 3) {
    return selected
  }

  return uniqueCards([...selected, ...fallbackCards]).slice(0, 3)
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
