import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialTutorialRunState,
  createTutorialRewardOffer,
  createUnlockState,
  getAvailableTutorialRewardCards,
  getCurrentTutorialEncounter,
  resolveTutorialReward,
} from '../core'
import { gameData } from '../data'

describe('T10 tutorial rewards', () => {
  it('creates a smaller ordinary reward for vanquish and a larger high reward for catalogue', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const ordinaryRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
      gameData.cards,
    )
    const highRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
    )

    expect(ordinaryRun.pendingReward?.quality).toBe('ordinary')
    expect(ordinaryRun.pendingReward?.options).toHaveLength(2)
    expect(ordinaryRun.pendingReward?.options.map((option) => option.cardDefinitionId)).not.toContain(
      'card_trace_name_slip',
    )

    expect(highRun.pendingReward?.quality).toBe('high')
    expect(highRun.pendingReward?.options).toHaveLength(3)
    expect(highRun.pendingReward?.options.map((option) => option.cardDefinitionId)).toContain(
      'card_trace_name_slip',
    )
  })

  it('filters reward cards by tutorial unlock state', () => {
    const firstEncounter = gameData.encounters[0]
    const abnormalUnlocks = createUnlockState(
      ['stage_core', 'stage_abnormal_boundary'],
      gameData.tutorialUnlocks,
    )
    const redInkUnlocks = createUnlockState(
      ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview'],
      gameData.tutorialUnlocks,
    )

    const beforeRedInk = createTutorialRewardOffer({
      encounter: firstEncounter,
      settlement: 'catalogue',
      unlocks: abnormalUnlocks,
      cardDefinitions: gameData.cards,
    })
    const afterRedInk = getAvailableTutorialRewardCards(
      gameData.cards,
      redInkUnlocks,
      'ordinary',
    )

    expect(beforeRedInk.options.map((option) => option.cardDefinitionId)).not.toContain(
      'card_red_ink_trial',
    )
    expect(afterRedInk.map((card) => card.id)).toContain('card_red_ink_trial')
  })

  it('adds the selected reward card to the persistent tutorial deck', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const advancedRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
    )
    const selectedCard = advancedRun.pendingReward?.options[0].cardDefinitionId

    if (!selectedCard) {
      throw new Error('Expected at least one reward option')
    }

    const rewardedRun = resolveTutorialReward(advancedRun, selectedCard)

    expect(rewardedRun.pendingReward).toBeUndefined()
    expect(rewardedRun.deckDefinitionIds).toEqual([...run.deckDefinitionIds, selectedCard])
    expect(rewardedRun.rewards).toEqual([
      expect.objectContaining({
        encounterId: 'encounter_tutorial_paper_wraith',
        settlement: 'catalogue',
        quality: 'high',
        selectedCardDefinitionId: selectedCard,
        skipped: false,
      }),
    ])
    expect(getCurrentTutorialEncounter(rewardedRun, gameData.encounters)?.id).toBe(
      'encounter_tutorial_incense_thief_mouse',
    )
  })

  it('records skipped rewards without changing the tutorial deck', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const advancedRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
      gameData.cards,
    )
    const skippedRun = resolveTutorialReward(advancedRun)

    expect(skippedRun.deckDefinitionIds).toEqual(run.deckDefinitionIds)
    expect(skippedRun.rewards[0]).toEqual(
      expect.objectContaining({
        skipped: true,
        selectedCardDefinitionId: undefined,
      }),
    )
  })
})
