import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialTutorialRunState,
  getAvailableRestOptions,
  resolveTutorialRest,
  TUTORIAL_REST_OPTIONS,
} from '../core'
import { gameData } from '../data'

const restRouteNodeId = 'route_node_rest_site'

describe('T21 rest resolver', () => {
  it('filters rest options by current unlocks and deck state', () => {
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

    expect(getAvailableRestOptions(coreRun).map((option) => option.id)).toEqual(['remove_card'])
    expect(getAvailableRestOptions(abnormalRun).map((option) => option.id)).toEqual([
      'remove_card',
    ])
    expect(getAvailableRestOptions(redInkRun).map((option) => option.id)).toEqual([
      'remove_card',
      'red_ink_service',
    ])
    expect(getAvailableRestOptions(oneCardRun).map((option) => option.id)).toEqual([])
  })

  it('removes the selected deck card and records the rest choice', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const targetCard = run.deckCards.find((card) => card.definitionId === 'card_zhu_fu')

    if (!targetCard) {
      throw new Error('Missing starter card_zhu_fu')
    }

    const nextRun = resolveTutorialRest(run, {
      optionId: 'remove_card',
      deckCardId: targetCard.id,
      routeNodeId: restRouteNodeId,
    })

    expect(nextRun.deckCards).toHaveLength(run.deckCards.length - 1)
    expect(nextRun.deckCards.some((card) => card.id === targetCard.id)).toBe(false)
    expect(nextRun.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu')).toHaveLength(
      run.deckDefinitionIds.filter((cardId) => cardId === 'card_zhu_fu').length - 1,
    )
    expect(nextRun.rests.records[0]).toEqual({
      id: 'rest_record_1',
      routeNodeId: restRouteNodeId,
      optionId: 'remove_card',
      removedDeckCardId: targetCard.id,
      removedCardDefinitionId: 'card_zhu_fu',
      formRestored: 0,
      playerCurrentFormAfter: 72,
      playerMaxFormAfter: 72,
      createdRedInkOffer: false,
    })
  })

  it('restores player form when the run is damaged', () => {
    const run = {
      ...createInitialTutorialRunState(gameData.tutorialUnlocks),
      playerForm: {
        current: 40,
        max: 72,
      },
    }

    expect(getAvailableRestOptions(run).map((option) => option.id)).toContain('restore_form')

    const nextRun = resolveTutorialRest(run, {
      optionId: 'restore_form',
      routeNodeId: restRouteNodeId,
    })

    expect(nextRun.playerForm).toEqual({
      current: 64,
      max: 72,
    })
    expect(nextRun.rests.records[0]).toEqual({
      id: 'rest_record_1',
      routeNodeId: restRouteNodeId,
      optionId: 'restore_form',
      formRestored: 24,
      playerCurrentFormAfter: 64,
      playerMaxFormAfter: 72,
      createdRedInkOffer: false,
    })
  })

  it('creates a red ink offer from the rest service after the preview unlock', () => {
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
    const nextRun = resolveTutorialRest(redInkRun, {
      optionId: 'red_ink_service',
      routeNodeId: restRouteNodeId,
    })

    expect(nextRun.pendingRedInk?.options.map((option) => option.id)).toEqual([
      'red_ink_return_incense',
      'red_ink_trace_name',
    ])
    expect(nextRun.rests.records[0]).toEqual(
      expect.objectContaining({
        id: 'rest_record_1',
        routeNodeId: restRouteNodeId,
        optionId: 'red_ink_service',
        createdRedInkOffer: true,
      }),
    )
  })

  it('blocks rest resolution while another run choice is pending', () => {
    const run = {
      ...createInitialTutorialRunState(gameData.tutorialUnlocks),
      pendingReward: {
        encounterId: 'encounter_tutorial_paper_wraith',
        settlement: 'vanquish',
        quality: 'ordinary',
        options: [],
      },
    } as const

    expect(() =>
      resolveTutorialRest(run, {
        optionId: 'remove_card',
        deckCardId: run.deckCards[0]?.id,
      }),
    ).toThrow('Resolve pending run choice before resolving a rest node')
  })

  it('keeps every rest option display key covered by localization', () => {
    const restLocalizationKeys = TUTORIAL_REST_OPTIONS.flatMap((option) => [
      option.nameKey,
      option.descriptionKey,
      option.rewardKey,
      option.costKey,
    ])

    expect(restLocalizationKeys.every((key) => gameData.localization[key])).toBe(true)
  })
})
