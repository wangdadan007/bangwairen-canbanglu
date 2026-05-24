import type {
  ArtifactDefinition,
  CardDefinition,
  CardId,
  IncenseSealDefinition,
  IncenseSealId,
  IncenseSealInstanceId,
  RouteNodeId,
  RunDeckCardId,
  TutorialCurrencyState,
  TutorialRunState,
  TutorialShopItemDefinition,
  TutorialShopRecord,
  TutorialShopState,
} from '../../types'
import { clearFirstPendingArtifactBacklash } from './artifactResolver'
import { appendRunDeckCard, removeRunDeckCard } from './deckResolver'
import { addIncenseSealToRun } from './incenseSealResolver'
import { createTutorialRedInkOffer } from './redInkResolver'
import {
  getAvailableTutorialRewardCards,
  getCardRarityWeight,
  getRoleRewardTagScore,
} from './rewardResolver'

export const DEFAULT_TUTORIAL_INCENSE_MONEY = 100

const REMOVE_CARD_BASE_PRICES = [45, 70, 95] as const
const SHOP_CARD_COUNT = 3
const FOULED_SCROLL_CARD_ID = 'card_fouled_scroll'

export interface ResolveTutorialShopPurchaseInput {
  readonly itemId: string
  readonly deckCardId?: RunDeckCardId
  readonly replaceIncenseSealInstanceId?: IncenseSealInstanceId
  readonly routeNodeId?: RouteNodeId
  readonly routeSeed?: string
  readonly routeTendencyIds?: readonly string[]
}

export interface GetAvailableShopItemsOptions {
  readonly routeNodeId?: RouteNodeId
  readonly routeSeed?: string
  readonly routeTendencyIds?: readonly string[]
  readonly incenseSealDefinitions?: readonly IncenseSealDefinition[]
}

export function createInitialTutorialCurrencyState(
  incenseMoney = DEFAULT_TUTORIAL_INCENSE_MONEY,
): TutorialCurrencyState {
  return {
    incenseMoney,
  }
}

export function createInitialTutorialShopState(): TutorialShopState {
  return {
    purchasedItemIds: [],
    records: [],
  }
}

export function getAvailableShopItems(
  run: TutorialRunState,
  shopItems: readonly TutorialShopItemDefinition[],
  cardDefinitions: readonly CardDefinition[],
  artifactDefinitions: readonly ArtifactDefinition[] = [],
  options: GetAvailableShopItemsOptions = {},
): readonly TutorialShopItemDefinition[] {
  void artifactDefinitions

  const shelf = createSeededShopShelf(
    run,
    shopItems,
    cardDefinitions,
    options,
  )

  return shelf.filter(
    (item) =>
      everyRequiredStageUnlocked(item, run) &&
      isShopItemMechanicallyAvailable(item, run, cardDefinitions),
  )
}

export function resolveTutorialShopPurchase(
  run: TutorialRunState,
  input: ResolveTutorialShopPurchaseInput,
  shopItems: readonly TutorialShopItemDefinition[],
  cardDefinitions: readonly CardDefinition[],
  artifactDefinitions: readonly ArtifactDefinition[] = [],
  incenseSealDefinitions: readonly IncenseSealDefinition[] = [],
): TutorialRunState {
  if (run.status !== 'active') {
    return run
  }

  if (
    run.pendingVerdict ||
    run.pendingReward ||
    run.pendingRedInk ||
    run.pendingArtifactOffer ||
    run.pendingIncenseSealOffer
  ) {
    throw new Error('Resolve pending run choice before resolving a shop purchase')
  }

  const item = getAvailableShopItems(run, shopItems, cardDefinitions, artifactDefinitions, {
    routeNodeId: input.routeNodeId,
    routeSeed: input.routeSeed,
    routeTendencyIds: input.routeTendencyIds,
    incenseSealDefinitions,
  }).find((candidate) => candidate.id === input.itemId)

  if (!item) {
    throw new Error(`Shop item is not available: ${input.itemId}`)
  }

  if (run.currency.incenseMoney < item.cost) {
    throw new Error(`Not enough incense money for shop item: ${item.id}`)
  }

  if (item.kind === 'card') {
    if (!item.cardDefinitionId) {
      throw new Error(`Shop card item is missing cardDefinitionId: ${item.id}`)
    }

    const record = createShopRecord(run, input, item, {
      purchasedCardDefinitionId: item.cardDefinitionId,
      createdRedInkOffer: false,
    })

    return {
      ...run,
      currency: spendIncenseMoney(run.currency, item.cost),
      deckDefinitionIds: [...run.deckDefinitionIds, item.cardDefinitionId],
      deckCards: appendRunDeckCard(run.deckCards, item.cardDefinitionId),
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
  }

  if (item.kind === 'artifact') {
    throw new Error('Shop artifact purchases are disabled in the current chapter')
  }

  if (item.kind === 'remove_card') {
    if (!input.deckCardId) {
      throw new Error('Shop remove card service requires a deck card id')
    }

    const removal = removeRunDeckCard(run.deckDefinitionIds, run.deckCards, input.deckCardId)
    const record = createShopRecord(run, input, item, {
      removedDeckCardId: removal.removedDeckCardId,
      removedCardDefinitionId: removal.removedCardDefinitionId,
      createdRedInkOffer: false,
    })

    return {
      ...run,
      currency: spendIncenseMoney(run.currency, item.cost),
      deckDefinitionIds: removal.deckDefinitionIds,
      deckCards: removal.deckCards,
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
  }

  if (item.kind === 'red_ink_service') {
    const record = createShopRecord(run, input, item, {
      createdRedInkOffer: true,
    })

    return {
      ...run,
      currency: spendIncenseMoney(run.currency, item.cost),
      pendingRedInk: createTutorialRedInkOffer(run),
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
  }

  if (item.kind === 'cleanse_service') {
    const cleanse = removeFouledScrollsFromRun(run, 2)
    const record = createShopRecord(run, input, item, {
      removedDeckCardId: cleanse.removedDeckCardIds[0],
      removedCardDefinitionId: cleanse.removedCardDefinitionIds[0],
      createdRedInkOffer: false,
    })

    return {
      ...run,
      currency: spendIncenseMoney(run.currency, item.cost),
      deckDefinitionIds: cleanse.deckDefinitionIds,
      deckCards: cleanse.deckCards,
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
  }

  if (item.kind === 'artifact_maintenance_service') {
    const maintenance = clearFirstPendingArtifactBacklash(run.artifacts)
    const record = createShopRecord(run, input, item, {
      createdRedInkOffer: false,
    })

    return {
      ...run,
      currency: spendIncenseMoney(run.currency, item.cost),
      artifacts: maintenance.artifacts,
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
  }

  if (item.kind === 'incense_seal') {
    if (!item.incenseSealDefinitionId) {
      throw new Error(`Shop incense seal item is missing incenseSealDefinitionId: ${item.id}`)
    }

    const replacedSeal = input.replaceIncenseSealInstanceId
      ? run.incenseSeals.seals.find((seal) => seal.id === input.replaceIncenseSealInstanceId)
      : run.incenseSeals.seals.length >= run.incenseSeals.maxSlots
        ? run.incenseSeals.seals[0]
        : undefined
    const runWithSeal = addIncenseSealToRun(
      run,
      item.incenseSealDefinitionId,
      'shop',
      input.replaceIncenseSealInstanceId,
    )
    const record = createShopRecord(run, input, item, {
      purchasedIncenseSealDefinitionId: item.incenseSealDefinitionId,
      replacedIncenseSealInstanceId: replacedSeal?.id,
      replacedIncenseSealDefinitionId: replacedSeal?.definitionId,
      createdRedInkOffer: false,
    })

    return {
      ...runWithSeal,
      currency: spendIncenseMoney(run.currency, item.cost),
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
  }

  return run
}

function createSeededShopShelf(
  run: TutorialRunState,
  shopItems: readonly TutorialShopItemDefinition[],
  cardDefinitions: readonly CardDefinition[],
  options: GetAvailableShopItemsOptions,
): readonly TutorialShopItemDefinition[] {
  const routeNodeId = options.routeNodeId ?? 'shop_unknown'
  const tendencySeed = (options.routeTendencyIds ?? []).join('-')
  const seed = `${options.routeSeed ?? 'chapter_one'}:${routeNodeId}:${
    run.roleId ?? 'default'
  }:${tendencySeed}`
  const cardItems = createSeededShopCardItems(run, cardDefinitions, routeNodeId, seed)
  const removeItem = createRouteScopedServiceItem(
    shopItems.find((item) => item.kind === 'remove_card'),
    routeNodeId,
    getRemoveCardPrice(run),
  )
  const redInkItem = createRouteScopedServiceItem(
    shopItems.find((item) => item.kind === 'red_ink_service'),
    routeNodeId,
  )
  const maintenanceItem = chooseMaintenanceServiceItem(run, shopItems, routeNodeId)
  const incenseSealItem = createSeededIncenseSealShopItem(
    run,
    options.incenseSealDefinitions ?? [],
    routeNodeId,
    seed,
  )

  return [
    ...cardItems,
    ...compactItems([removeItem, redInkItem, maintenanceItem, incenseSealItem]),
  ].filter(
    (item) =>
      !run.shops.records.some(
        (record) => record.routeNodeId === routeNodeId && record.itemId === item.id,
      ),
  )
}

function createSeededShopCardItems(
  run: TutorialRunState,
  cardDefinitions: readonly CardDefinition[],
  routeNodeId: RouteNodeId,
  seed: string,
): readonly TutorialShopItemDefinition[] {
  const purchasedCardIds = new Set(
    run.shops.records.flatMap((record) => record.purchasedCardDefinitionId ?? []),
  )
  const candidates = getAvailableTutorialRewardCards(cardDefinitions, run.unlocks).filter(
    (card) => !purchasedCardIds.has(card.id),
  )
  const ordered = rotateCards(
    [...candidates].sort(
      (left, right) =>
        getShopCardScore(right, run) - getShopCardScore(left, run) ||
        left.id.localeCompare(right.id),
    ),
    seed,
  )

  return ordered.slice(0, SHOP_CARD_COUNT).map((card) => ({
    id: `shop_card_${routeNodeId}_${card.id}`,
    kind: 'card',
    nameKey: card.nameKey,
    descriptionKey: card.rulesTextKey,
    cost: getShopCardCost(card),
    currency: 'incense_money',
    cardDefinitionId: card.id,
    shelfSlot: 'card',
  }))
}

function getShopCardScore(card: CardDefinition, run: TutorialRunState) {
  return getRoleRewardTagScore(card, run.roleId) + getCardRarityWeight(card.rarity) + card.cost
}

export function getShopCardCost(card: CardDefinition) {
  const rarityBase = card.rarity === 'rare' ? 74 : card.rarity === 'uncommon' ? 54 : 36
  const costTax = card.cost >= 2 ? 16 : card.cost <= 0 ? -6 : 0
  const stageTax = card.unlockStage === 'stage_three_altars' ? 8 : card.unlockStage === 'stage_run_resources' ? 6 : 0

  return Math.max(20, rarityBase + costTax + stageTax)
}

function createRouteScopedServiceItem(
  item: TutorialShopItemDefinition | undefined,
  routeNodeId: RouteNodeId,
  overrideCost?: number,
): TutorialShopItemDefinition | undefined {
  if (!item) {
    return undefined
  }

  return {
    ...item,
    id: `${item.id}_${routeNodeId}`,
    cost: overrideCost ?? item.cost,
    repeatable: false,
  }
}

function chooseMaintenanceServiceItem(
  run: TutorialRunState,
  shopItems: readonly TutorialShopItemDefinition[],
  routeNodeId: RouteNodeId,
) {
  const cleanseItem = shopItems.find((item) => item.kind === 'cleanse_service')
  const maintenanceItem = shopItems.find((item) => item.kind === 'artifact_maintenance_service')

  if (run.deckCards.some((card) => card.definitionId === FOULED_SCROLL_CARD_ID) && cleanseItem) {
    return createRouteScopedServiceItem(cleanseItem, routeNodeId)
  }

  if (run.artifacts.artifacts.some((artifact) => artifact.pendingBacklash) && maintenanceItem) {
    return createRouteScopedServiceItem(maintenanceItem, routeNodeId)
  }

  return cleanseItem ? createRouteScopedServiceItem(cleanseItem, routeNodeId) : undefined
}

function createSeededIncenseSealShopItem(
  run: TutorialRunState,
  incenseSealDefinitions: readonly IncenseSealDefinition[],
  routeNodeId: RouteNodeId,
  seed: string,
): TutorialShopItemDefinition | undefined {
  if (incenseSealDefinitions.length === 0 || !run.unlocks.stages.includes('stage_human_altar')) {
    return undefined
  }

  const seal = rotateIncenseSeals(incenseSealDefinitions, `${seed}:incense_seal`)[0]

  if (!seal) {
    return undefined
  }

  return {
    id: `shop_incense_seal_${routeNodeId}_${seal.id}`,
    kind: 'incense_seal',
    nameKey: seal.nameKey,
    descriptionKey: seal.rulesTextKey,
    cost: seal.price,
    currency: 'incense_money',
    incenseSealDefinitionId: seal.id,
    shelfSlot: 'incense_seal',
  }
}

function spendIncenseMoney(currency: TutorialCurrencyState, cost: number): TutorialCurrencyState {
  return {
    incenseMoney: currency.incenseMoney - cost,
  }
}

function everyRequiredStageUnlocked(item: TutorialShopItemDefinition, run: TutorialRunState) {
  return (item.requiredUnlockStages ?? []).every((stageId) => run.unlocks.stages.includes(stageId))
}

function isShopItemMechanicallyAvailable(
  item: TutorialShopItemDefinition,
  run: TutorialRunState,
  cardDefinitions: readonly CardDefinition[],
) {
  if (!item.repeatable && run.shops.purchasedItemIds.includes(item.id)) {
    return false
  }

  if (item.kind === 'remove_card') {
    return run.deckCards.length > 1
  }

  if (item.kind === 'cleanse_service') {
    return run.deckCards.some((card) => card.definitionId === FOULED_SCROLL_CARD_ID)
  }

  if (item.kind === 'artifact_maintenance_service') {
    return run.artifacts.artifacts.some((artifact) => artifact.pendingBacklash)
  }

  if (item.kind === 'artifact') {
    return false
  }

  if (item.kind !== 'card') {
    return true
  }

  const card = item.cardDefinitionId
    ? cardDefinitions.find((candidate) => candidate.id === item.cardDefinitionId)
    : undefined

  return Boolean(card && run.unlocks.stages.includes(card.unlockStage))
}

function updateShopStateAfterPurchase(
  shop: TutorialShopState,
  item: TutorialShopItemDefinition,
  record: TutorialShopRecord,
): TutorialShopState {
  return {
    purchasedItemIds: item.repeatable
      ? shop.purchasedItemIds
      : addUniqueId(shop.purchasedItemIds, item.id),
    records: [...shop.records, record],
  }
}

function createShopRecord(
  run: TutorialRunState,
  input: ResolveTutorialShopPurchaseInput,
  item: TutorialShopItemDefinition,
  result: {
    readonly purchasedCardDefinitionId?: CardId
    readonly purchasedArtifactDefinitionId?: string
    readonly purchasedIncenseSealDefinitionId?: IncenseSealId
    readonly removedDeckCardId?: RunDeckCardId
    readonly removedCardDefinitionId?: CardId
    readonly replacedIncenseSealInstanceId?: IncenseSealInstanceId
    readonly replacedIncenseSealDefinitionId?: IncenseSealId
    readonly createdRedInkOffer: boolean
  },
): TutorialShopRecord {
  return {
    id: `shop_record_${run.shops.records.length + 1}`,
    routeNodeId: input.routeNodeId,
    itemId: item.id,
    kind: item.kind,
    cost: item.cost,
    purchasedCardDefinitionId: result.purchasedCardDefinitionId,
    purchasedArtifactDefinitionId: result.purchasedArtifactDefinitionId,
    purchasedIncenseSealDefinitionId: result.purchasedIncenseSealDefinitionId,
    removedDeckCardId: result.removedDeckCardId,
    removedCardDefinitionId: result.removedCardDefinitionId,
    replacedIncenseSealInstanceId: result.replacedIncenseSealInstanceId,
    replacedIncenseSealDefinitionId: result.replacedIncenseSealDefinitionId,
    createdRedInkOffer: result.createdRedInkOffer,
  }
}

function removeFouledScrollsFromRun(run: TutorialRunState, maxCount: number) {
  let remaining = maxCount
  const removedDeckCardIds: RunDeckCardId[] = []
  const removedCardDefinitionIds: CardId[] = []
  const deckCards = run.deckCards.filter((card) => {
    if (remaining > 0 && card.definitionId === FOULED_SCROLL_CARD_ID) {
      remaining -= 1
      removedDeckCardIds.push(card.id)
      removedCardDefinitionIds.push(card.definitionId)
      return false
    }

    return true
  })
  let removedDefinitions = removedCardDefinitionIds.length
  const deckDefinitionIds = run.deckDefinitionIds.filter((cardId) => {
    if (removedDefinitions > 0 && cardId === FOULED_SCROLL_CARD_ID) {
      removedDefinitions -= 1
      return false
    }

    return true
  })

  return {
    deckDefinitionIds,
    deckCards,
    removedDeckCardIds,
    removedCardDefinitionIds,
  }
}

function getRemoveCardPrice(run: TutorialRunState) {
  const removeCount = run.shops.records.filter((record) => record.kind === 'remove_card').length

  return REMOVE_CARD_BASE_PRICES[Math.min(removeCount, REMOVE_CARD_BASE_PRICES.length - 1)]
}

function compactItems(
  items: readonly (TutorialShopItemDefinition | undefined)[],
): readonly TutorialShopItemDefinition[] {
  return items.filter((item): item is TutorialShopItemDefinition => Boolean(item))
}

function rotateCards(cards: readonly CardDefinition[], seed: string): readonly CardDefinition[] {
  if (cards.length <= 1) {
    return cards
  }

  const offset = getStableOffset(seed, cards.length)

  return [...cards.slice(offset), ...cards.slice(0, offset)]
}

function rotateIncenseSeals(
  seals: readonly IncenseSealDefinition[],
  seed: string,
): readonly IncenseSealDefinition[] {
  if (seals.length <= 1) {
    return seals
  }

  const offset = getStableOffset(seed, seals.length)

  return [...seals.slice(offset), ...seals.slice(0, offset)]
}

function getStableOffset(seed: string, modulo: number): number {
  let hash = 0

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647
  }

  return hash % modulo
}

function addUniqueId(ids: readonly string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id]
}
