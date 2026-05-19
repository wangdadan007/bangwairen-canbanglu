import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialTutorialRunState,
  getAvailableShopItems,
  resolveTutorialShopPurchase,
} from '../core'
import { gameData } from '../data'

const shopRouteNodeId = 'route_node_first_shop'

describe('T22 shop resolver', () => {
  it('filters shop items by unlock stage and current deck state', () => {
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
    const oneCardRun = createInitialTutorialRunState(gameData.tutorialUnlocks, undefined, [
      'card_zhu_fu',
    ])

    expect(getAvailableShopItems(coreRun, gameData.shopItems, gameData.cards).map((item) => item.id)).toEqual([
      'shop_card_trace_name_slip',
      'shop_remove_card',
    ])
    expect(
      getAvailableShopItems(abnormalRun, gameData.shopItems, gameData.cards).map((item) => item.id),
    ).toEqual(['shop_card_trace_name_slip', 'shop_card_press_door_charm', 'shop_remove_card'])
    expect(
      getAvailableShopItems(redInkRun, gameData.shopItems, gameData.cards).map((item) => item.id),
    ).toEqual([
      'shop_card_trace_name_slip',
      'shop_card_press_door_charm',
      'shop_card_red_ink_trial',
      'shop_remove_card',
      'shop_red_ink_service',
    ])
    expect(
      getAvailableShopItems(oneCardRun, gameData.shopItems, gameData.cards).map((item) => item.id),
    ).toEqual(['shop_card_trace_name_slip'])
  })

  it('buys a card, spends incense money, and records the purchase', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const nextRun = resolveTutorialShopPurchase(
      run,
      {
        itemId: 'shop_card_trace_name_slip',
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
    )

    expect(nextRun.currency.incenseMoney).toBe(run.currency.incenseMoney - 35)
    expect(nextRun.deckDefinitionIds).toEqual([...run.deckDefinitionIds, 'card_trace_name_slip'])
    expect(nextRun.deckCards[nextRun.deckCards.length - 1]?.definitionId).toBe(
      'card_trace_name_slip',
    )
    expect(nextRun.shops.purchasedItemIds).toEqual(['shop_card_trace_name_slip'])
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        id: 'shop_record_1',
        routeNodeId: shopRouteNodeId,
        itemId: 'shop_card_trace_name_slip',
        kind: 'card',
        cost: 35,
        purchasedCardDefinitionId: 'card_trace_name_slip',
        createdRedInkOffer: false,
      }),
    )
    expect(
      getAvailableShopItems(nextRun, gameData.shopItems, gameData.cards).map((item) => item.id),
    ).not.toContain('shop_card_trace_name_slip')
  })

  it('rejects purchases when incense money is insufficient', () => {
    const run = {
      ...createInitialTutorialRunState(gameData.tutorialUnlocks),
      currency: {
        incenseMoney: 0,
      },
    }

    expect(() =>
      resolveTutorialShopPurchase(
        run,
        {
          itemId: 'shop_card_trace_name_slip',
        },
        gameData.shopItems,
        gameData.cards,
      ),
    ).toThrow('Not enough incense money for shop item: shop_card_trace_name_slip')
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
        itemId: 'shop_remove_card',
        deckCardId: targetCard.id,
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
    )

    expect(nextRun.currency.incenseMoney).toBe(run.currency.incenseMoney - 30)
    expect(nextRun.deckCards.some((card) => card.id === targetCard.id)).toBe(false)
    expect(nextRun.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu')).toHaveLength(
      run.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu').length - 1,
    )
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        itemId: 'shop_remove_card',
        kind: 'remove_card',
        removedDeckCardId: targetCard.id,
        removedCardDefinitionId: 'card_zhu_fu',
        createdRedInkOffer: false,
      }),
    )
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
        itemId: 'shop_red_ink_service',
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
    )

    expect(nextRun.currency.incenseMoney).toBe(redInkRun.currency.incenseMoney - 60)
    expect(nextRun.pendingRedInk?.options.map((option) => option.id)).toEqual([
      'red_ink_return_incense',
      'red_ink_trace_name',
      'red_ink_named_draw',
      'red_ink_press_momentum',
    ])
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        itemId: 'shop_red_ink_service',
        kind: 'red_ink_service',
        cost: 60,
        createdRedInkOffer: true,
      }),
    )
  })

  it('buys an unlocked artifact without putting it into the deck', () => {
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

    expect(
      getAvailableShopItems(
        abnormalRun,
        gameData.shopItems,
        gameData.cards,
        gameData.artifacts,
      ).map((item) => item.id),
    ).toContain('shop_artifact_seal_door_tablet')

    const nextRun = resolveTutorialShopPurchase(
      abnormalRun,
      {
        itemId: 'shop_artifact_seal_door_tablet',
        routeNodeId: shopRouteNodeId,
      },
      gameData.shopItems,
      gameData.cards,
      gameData.artifacts,
    )

    expect(nextRun.currency.incenseMoney).toBe(abnormalRun.currency.incenseMoney - 55)
    expect(nextRun.artifacts.artifacts.map((artifact) => artifact.definitionId)).toContain(
      'artifact_seal_door_tablet',
    )
    expect(nextRun.deckDefinitionIds).not.toContain('artifact_seal_door_tablet')
    expect(nextRun.deckCards.map((card) => card.definitionId)).not.toContain(
      'artifact_seal_door_tablet',
    )
    expect(nextRun.shops.records[0]).toEqual(
      expect.objectContaining({
        itemId: 'shop_artifact_seal_door_tablet',
        kind: 'artifact',
        cost: 55,
        purchasedArtifactDefinitionId: 'artifact_seal_door_tablet',
        createdRedInkOffer: false,
      }),
    )
    expect(
      getAvailableShopItems(
        nextRun,
        gameData.shopItems,
        gameData.cards,
        gameData.artifacts,
      ).map((item) => item.id),
    ).not.toContain('shop_artifact_seal_door_tablet')
  })
})
