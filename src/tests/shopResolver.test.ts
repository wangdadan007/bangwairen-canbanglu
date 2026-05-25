import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialTutorialRunState,
  getAvailableShopItems,
  resolveTutorialShopPurchase,
} from '../core'
import { gameData } from '../data'

const shopRouteNodeId = 'route_node_first_shop'
const tutorialPlusEncounterIds = [
  'encounter_tutorial_paper_wraith',
  'encounter_tutorial_incense_thief_mouse',
  'encounter_tutorial_bronze_bell_patrol',
  'encounter_mid_unlit_temple_warden',
]

describe('T22 shop resolver', () => {
  it('filters shop items by unlock stage and current deck state', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks, tutorialPlusEncounterIds)
    const abnormalRun = advanceTutorialRun(
      coreRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const redInkRun = advanceTutorialRun(
      abnormalRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const humanAltarRun = advanceTutorialRun(
      redInkRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const oneCardRun = createInitialTutorialRunState(gameData.tutorialUnlocks, undefined, [
      'card_zhu_fu',
    ])

    expect(getShopItems(coreRun).map((item) => item.kind)).toEqual(['card', 'remove_card'])
    expect(getShopItems(abnormalRun).map((item) => item.kind)).toEqual([
      'card',
      'card',
      'card',
      'remove_card',
    ])
    expect(getShopItems(redInkRun).map((item) => item.kind)).toEqual([
      'card',
      'card',
      'card',
      'remove_card',
      'red_ink_service',
    ])
    expect(getShopItems(humanAltarRun).map((item) => item.kind)).toEqual([
      'card',
      'card',
      'card',
      'remove_card',
      'red_ink_service',
      'incense_seal',
    ])
    expect(getShopItems(oneCardRun).map((item) => item.kind)).toEqual(['card'])
  })

  it('buys a card, spends incense money, and records the purchase', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks, tutorialPlusEncounterIds)
    const run = advanceTutorialRun(
      advanceTutorialRun(
        advanceTutorialRun(
          coreRun,
          gameData.encounters,
          gameData.tutorialUnlocks,
          'vanquish',
        ),
        gameData.encounters,
        gameData.tutorialUnlocks,
        'vanquish',
      ),
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const cardItem = getShopItems(run).find((item) => item.kind === 'card')

    if (!cardItem?.cardDefinitionId) {
      throw new Error('Expected shop card item')
    }

    const nextRun = resolveTutorialShopPurchase(
      run,
      {
        itemId: cardItem.id,
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
      gameData.incenseSeals,
    )

    expect(nextRun.currency.incenseMoney).toBe(run.currency.incenseMoney - cardItem.cost)
    expect(nextRun.deckDefinitionIds).toEqual([...run.deckDefinitionIds, cardItem.cardDefinitionId])
    expect(nextRun.deckCards[nextRun.deckCards.length - 1]?.definitionId).toBe(cardItem.cardDefinitionId)
    expect(nextRun.shops.purchasedItemIds).toEqual([cardItem.id])
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        id: 'shop_record_1',
        routeNodeId: shopRouteNodeId,
        itemId: cardItem.id,
        kind: 'card',
        cost: cardItem.cost,
        purchasedCardDefinitionId: cardItem.cardDefinitionId,
        createdRedInkOffer: false,
      }),
    )
    expect(getShopItems(nextRun).map((item) => item.id)).not.toContain(cardItem.id)
  })

  it('rejects purchases when incense money is insufficient', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks, tutorialPlusEncounterIds)
    const run = {
      ...advanceTutorialRun(
        advanceTutorialRun(
          advanceTutorialRun(
            coreRun,
            gameData.encounters,
            gameData.tutorialUnlocks,
            'vanquish',
          ),
          gameData.encounters,
          gameData.tutorialUnlocks,
          'vanquish',
        ),
        gameData.encounters,
        gameData.tutorialUnlocks,
        'vanquish',
      ),
      currency: {
        incenseMoney: 0,
      },
    }
    const cardItem = getShopItems(run).find((item) => item.kind === 'card')

    if (!cardItem) {
      throw new Error('Expected shop card item')
    }

    expect(() =>
      resolveTutorialShopPurchase(
        run,
        {
          itemId: cardItem.id,
          routeNodeId: shopRouteNodeId,
        },
        gameData.shopItems,
        gameData.cards,
        gameData.artifacts,
        gameData.incenseSeals,
      ),
    ).toThrow(`Not enough incense money for shop item: ${cardItem.id}`)
  })

  it('uses the remove card service on the selected deck card', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const targetCard = run.deckCards.find((card) => card.definitionId === 'card_zhu_fu')

    if (!targetCard) {
      throw new Error('Missing starter card_zhu_fu')
    }

    const nextRun = resolveTutorialShopPurchase(
      run,
      {
        itemId: `shop_remove_card_${shopRouteNodeId}`,
        deckCardId: targetCard.id,
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
      gameData.incenseSeals,
    )

    expect(nextRun.currency.incenseMoney).toBe(run.currency.incenseMoney - 45)
    expect(nextRun.deckCards.some((card) => card.id === targetCard.id)).toBe(false)
    expect(nextRun.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu')).toHaveLength(
      run.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu').length - 1,
    )
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        itemId: `shop_remove_card_${shopRouteNodeId}`,
        kind: 'remove_card',
        removedDeckCardId: targetCard.id,
        removedCardDefinitionId: 'card_zhu_fu',
        createdRedInkOffer: false,
      }),
    )
    expect(
      getShopItems(nextRun).map((item) => item.id),
    ).not.toContain(`shop_remove_card_${shopRouteNodeId}`)
  })

  it('buys a temporary red ink service after the red ink unlock', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const abnormalRun = advanceTutorialRun(
      coreRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const redInkRun = advanceTutorialRun(
      abnormalRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const nextRun = resolveTutorialShopPurchase(
      redInkRun,
      {
        itemId: `shop_red_ink_service_${shopRouteNodeId}`,
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
      gameData.incenseSeals,
    )

    expect(nextRun.currency.incenseMoney).toBe(redInkRun.currency.incenseMoney - 60)
    expect(nextRun.pendingRedInk?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'red_ink_return_incense',
        'red_ink_trace_name',
        'red_ink_named_draw',
        'red_ink_press_momentum',
      ]),
    )
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        itemId: `shop_red_ink_service_${shopRouteNodeId}`,
        kind: 'red_ink_service',
        cost: 60,
        createdRedInkOffer: true,
      }),
    )
  })

  it('sells one-shot incense seals after the human altar unlock', () => {
    const run = advanceTutorialRun(
      advanceTutorialRun(
        advanceTutorialRun(
          createInitialTutorialRunState(gameData.tutorialUnlocks, tutorialPlusEncounterIds),
          gameData.encounters,
          gameData.tutorialUnlocks,
          'vanquish',
        ),
        gameData.encounters,
        gameData.tutorialUnlocks,
        'vanquish',
      ),
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const sealItem = getShopItems(run).find((item) => item.kind === 'incense_seal')

    if (!sealItem?.incenseSealDefinitionId) {
      throw new Error('Expected incense seal shop item')
    }

    const nextRun = resolveTutorialShopPurchase(
      run,
      {
        itemId: sealItem.id,
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
      gameData.incenseSeals,
    )

    expect(nextRun.currency.incenseMoney).toBe(run.currency.incenseMoney - sealItem.cost)
    expect(nextRun.incenseSeals.seals.map((seal) => seal.definitionId)).toContain(
      sealItem.incenseSealDefinitionId,
    )
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        itemId: sealItem.id,
        kind: 'incense_seal',
        purchasedIncenseSealDefinitionId: sealItem.incenseSealDefinitionId,
      }),
    )
  })

  it('keeps a two-seal floor on the T87 fracture shop branch only', () => {
    const run = advanceTutorialRun(
      advanceTutorialRun(
        advanceTutorialRun(
          createInitialTutorialRunState(gameData.tutorialUnlocks, tutorialPlusEncounterIds),
          gameData.encounters,
          gameData.tutorialUnlocks,
          'vanquish',
        ),
        gameData.encounters,
        gameData.tutorialUnlocks,
        'vanquish',
      ),
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const normalShopSealItems = getShopItems(run).filter((item) => item.kind === 'incense_seal')
    const fractureShopSealItems = getAvailableShopItems(
      run,
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
      {
        routeNodeId: 'route_node_fracture_shop',
        routeSeed: gameData.routes[0]?.id,
        routeTendencyIds: ['fracture', 'supply'],
        incenseSealDefinitions: gameData.incenseSeals,
      },
    ).filter((item) => item.kind === 'incense_seal')

    expect(normalShopSealItems).toHaveLength(1)
    expect(fractureShopSealItems).toHaveLength(2)
    expect(new Set(fractureShopSealItems.map((item) => item.incenseSealDefinitionId)).size).toBe(2)
  })

  it('does not expose direct artifact purchases in the current shop data', () => {
    const coreRun = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      undefined,
      undefined,
      gameData.artifacts,
    )
    const abnormalRun = advanceTutorialRun(
      coreRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    const itemIds = getAvailableShopItems(
      abnormalRun,
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
    ).map((item) => item.id)

    expect(itemIds.some((itemId) => itemId.startsWith('shop_artifact_'))).toBe(false)
    expect(() =>
      resolveTutorialShopPurchase(
        abnormalRun,
        {
          itemId: 'shop_artifact_seal_door_tablet',
          routeNodeId: shopRouteNodeId,
        },
        gameData.shopItems,
        gameData.cards,
        gameData.artifacts,
      ),
    ).toThrow('Shop item is not available: shop_artifact_seal_door_tablet')
  })
})

function getShopItems(run: ReturnType<typeof createInitialTutorialRunState>) {
  return getAvailableShopItems(run, gameData.shopItems, gameData.cards, gameData.artifacts, {
    routeNodeId: shopRouteNodeId,
    incenseSealDefinitions: gameData.incenseSeals,
  })
}
