import type {
  ArtifactDefinition,
  CardDefinition,
  CardId,
  RouteNodeId,
  RunDeckCardId,
  TutorialCurrencyState,
  TutorialRunState,
  TutorialShopItemDefinition,
  TutorialShopRecord,
  TutorialShopState,
} from '../../types'
import { addArtifactToCollection } from './artifactResolver'
import { appendRunDeckCard, removeRunDeckCard } from './deckResolver'
import { RED_INK_OPTIONS } from './redInkResolver'

export const DEFAULT_TUTORIAL_INCENSE_MONEY = 100

export interface ResolveTutorialShopPurchaseInput {
  readonly itemId: string
  readonly deckCardId?: RunDeckCardId
  readonly routeNodeId?: RouteNodeId
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
): readonly TutorialShopItemDefinition[] {
  return shopItems.filter(
    (item) =>
      everyRequiredStageUnlocked(item, run) &&
      isShopItemMechanicallyAvailable(item, run, cardDefinitions, artifactDefinitions),
  )
}

export function resolveTutorialShopPurchase(
  run: TutorialRunState,
  input: ResolveTutorialShopPurchaseInput,
  shopItems: readonly TutorialShopItemDefinition[],
  cardDefinitions: readonly CardDefinition[],
  artifactDefinitions: readonly ArtifactDefinition[] = [],
): TutorialRunState {
  if (run.status !== 'active') {
    return run
  }

  if (run.pendingVerdict || run.pendingReward || run.pendingRedInk || run.pendingArtifactOffer) {
    throw new Error('Resolve pending run choice before resolving a shop purchase')
  }

  const item = getAvailableShopItems(run, shopItems, cardDefinitions, artifactDefinitions).find(
    (candidate) => candidate.id === input.itemId,
  )

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
    if (!item.artifactDefinitionId) {
      throw new Error(`Shop artifact item is missing artifactDefinitionId: ${item.id}`)
    }

    const artifactDefinition = artifactDefinitions.find(
      (candidate) => candidate.id === item.artifactDefinitionId,
    )

    if (!artifactDefinition) {
      throw new Error(`Shop artifact item references missing artifact: ${item.artifactDefinitionId}`)
    }

    const record = createShopRecord(run, input, item, {
      purchasedArtifactDefinitionId: item.artifactDefinitionId,
      createdRedInkOffer: false,
    })

    return {
      ...run,
      currency: spendIncenseMoney(run.currency, item.cost),
      artifacts: addArtifactToCollection(run.artifacts, artifactDefinition),
      shops: updateShopStateAfterPurchase(run.shops, item, record),
    }
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

  const record = createShopRecord(run, input, item, {
    createdRedInkOffer: true,
  })

  return {
    ...run,
    currency: spendIncenseMoney(run.currency, item.cost),
    pendingRedInk: {
      id: `red_ink_offer_${run.redInkRecords.length + 1}`,
      options: RED_INK_OPTIONS,
    },
    shops: updateShopStateAfterPurchase(run.shops, item, record),
  }
}

function spendIncenseMoney(
  currency: TutorialCurrencyState,
  cost: number,
): TutorialCurrencyState {
  return {
    incenseMoney: currency.incenseMoney - cost,
  }
}

function everyRequiredStageUnlocked(item: TutorialShopItemDefinition, run: TutorialRunState) {
  return (item.requiredUnlockStages ?? []).every((stageId) =>
    run.unlocks.stages.includes(stageId),
  )
}

function isShopItemMechanicallyAvailable(
  item: TutorialShopItemDefinition,
  run: TutorialRunState,
  cardDefinitions: readonly CardDefinition[],
  artifactDefinitions: readonly ArtifactDefinition[],
) {
  if (!item.repeatable && run.shops.purchasedItemIds.includes(item.id)) {
    return false
  }

  if (item.kind === 'remove_card') {
    return run.deckCards.length > 1
  }

  if (item.kind === 'artifact') {
    const artifact = item.artifactDefinitionId
      ? artifactDefinitions.find((candidate) => candidate.id === item.artifactDefinitionId)
      : undefined

    return Boolean(
      artifact &&
        run.unlocks.stages.includes(artifact.unlockStage) &&
        !run.artifacts.artifacts.some((candidate) => candidate.definitionId === artifact.id),
    )
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
    readonly removedDeckCardId?: RunDeckCardId
    readonly removedCardDefinitionId?: CardId
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
    removedDeckCardId: result.removedDeckCardId,
    removedCardDefinitionId: result.removedCardDefinitionId,
    createdRedInkOffer: result.createdRedInkOffer,
  }
}

function addUniqueId(ids: readonly string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id]
}
