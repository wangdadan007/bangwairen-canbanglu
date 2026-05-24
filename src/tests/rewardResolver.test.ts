import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialTutorialRunState,
  createTutorialRewardOffer,
  createUnlockState,
  getAvailableTutorialRewardCards,
  getCurrentTutorialEncounter,
  HENGJIAN_ROLE_ID,
  LIANJIN_ROLE_ID,
  resolveTutorialReward,
  ZHAOWEI_ROLE_ID,
} from '../core'
import { gameData } from '../data'

const getCardTags = (cardDefinitionId: string): readonly string[] => {
  const card = gameData.cards.find((candidate) => candidate.id === cardDefinitionId)

  if (!card) {
    throw new Error(`Unknown card: ${cardDefinitionId}`)
  }

  return card.tags
}

const expectFirstRewardToMatchFamily = (
  cardDefinitionId: string,
  familyTags: readonly string[],
): void => {
  expect(getCardTags(cardDefinitionId).some((tag) => familyTags.includes(tag))).toBe(true)
}

describe('T10 tutorial rewards', () => {
  it('uses the same three-card reward pool for vanquish and catalogue', () => {
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
    expect(highRun.pendingReward?.quality).toBe('high')
    expect(ordinaryRun.pendingReward?.options).toHaveLength(3)
    expect(highRun.pendingReward?.options).toHaveLength(3)
    expect(ordinaryRun.pendingReward?.options.map((option) => option.cardDefinitionId)).toEqual(
      highRun.pendingReward?.options.map((option) => option.cardDefinitionId),
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
    const humanAltarUnlocks = createUnlockState(
      [
        'stage_core',
        'stage_abnormal_boundary',
        'stage_red_ink_preview',
        'stage_human_altar',
      ],
      gameData.tutorialUnlocks,
    )
    const resourceUnlocks = createUnlockState(
      ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview', 'stage_run_resources'],
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
    )

    expect(beforeRedInk.options.map((option) => option.cardDefinitionId)).not.toContain(
      'card_red_ink_trial',
    )
    expect(afterRedInk.map((card) => card.id)).toContain('card_red_ink_trial')
    expect(afterRedInk.map((card) => card.id)).not.toContain('card_sweep_ash_talisman')
    expect(getAvailableTutorialRewardCards(
      gameData.cards,
      humanAltarUnlocks,
    ).map((card) => card.id)).toEqual(
      expect.arrayContaining(['card_sweep_ash_talisman', 'card_chase_imp_talisman']),
    )
    expect(afterRedInk.map((card) => card.id)).not.toContain('card_ink_rubbing_slip')
    expect(getAvailableTutorialRewardCards(
      gameData.cards,
      resourceUnlocks,
    ).map((card) => card.id)).toEqual(
      expect.arrayContaining([
        'card_ink_rubbing_slip',
        'card_borrowed_doom_talisman',
        'card_clean_scroll_charm',
      ]),
    )
  })

  it('keeps T37 and T38 card additions gated by stage instead of settlement', () => {
    const resourceUnlocks = createUnlockState(
      ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview', 'stage_run_resources'],
      gameData.tutorialUnlocks,
    )
    const altarUnlocks = createUnlockState(
      [
        'stage_core',
        'stage_abnormal_boundary',
        'stage_red_ink_preview',
        'stage_run_resources',
        'stage_human_altar',
        'stage_three_altars',
      ],
      gameData.tutorialUnlocks,
    )
    const resourceRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      resourceUnlocks,
    ).map((card) => card.id)
    const altarRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      altarUnlocks,
    ).map((card) => card.id)

    expect(resourceRewardIds).toEqual(
      expect.arrayContaining([
        'card_clean_scroll_charm',
        'card_doom_account_tally',
        'card_fracture_guard_talisman',
      ]),
    )
    expect(resourceRewardIds).not.toContain('card_name_net_talisman')
    expect(altarRewardIds).toEqual(
      expect.arrayContaining([
        'card_name_net_talisman',
        'card_ash_lamp_counterseal',
        'card_altar_threefold_sigil',
      ]),
    )
  })

  it('tilts T65 reward options toward the selected role without changing option count', () => {
    const allUnlocks = createUnlockState(
      [
        'stage_core',
        'stage_abnormal_boundary',
        'stage_red_ink_preview',
        'stage_run_resources',
        'stage_human_altar',
        'stage_three_altars',
      ],
      gameData.tutorialUnlocks,
    )
    const firstEncounter = gameData.encounters[0]
    const hengjianOffer = createTutorialRewardOffer({
      encounter: firstEncounter,
      settlement: 'catalogue',
      unlocks: allUnlocks,
      cardDefinitions: gameData.cards,
      roleId: HENGJIAN_ROLE_ID,
    })
    const zhaoweiOffer = createTutorialRewardOffer({
      encounter: firstEncounter,
      settlement: 'catalogue',
      unlocks: allUnlocks,
      cardDefinitions: gameData.cards,
      roleId: ZHAOWEI_ROLE_ID,
    })
    const lianjinOffer = createTutorialRewardOffer({
      encounter: firstEncounter,
      settlement: 'catalogue',
      unlocks: allUnlocks,
      cardDefinitions: gameData.cards,
      roleId: LIANJIN_ROLE_ID,
    })

    expect(hengjianOffer.options).toHaveLength(3)
    expect(zhaoweiOffer.options).toHaveLength(3)
    expect(lianjinOffer.options).toHaveLength(3)
    expectFirstRewardToMatchFamily(hengjianOffer.options[0].cardDefinitionId, [
      'whip',
      'judgement',
      'formation',
    ])
    expectFirstRewardToMatchFamily(zhaoweiOffer.options[0].cardDefinitionId, [
      'thunder',
      'whip',
      'formation',
      'ask_name',
    ])
    expectFirstRewardToMatchFamily(lianjinOffer.options[0].cardDefinitionId, [
      'fire',
      'thunder',
      'judgement',
      'break_form',
    ])
  })

  it('keeps the expanded T15 card pool gated by tutorial unlocks', () => {
    const coreUnlocks = createUnlockState(['stage_core'], gameData.tutorialUnlocks)
    const abnormalUnlocks = createUnlockState(
      ['stage_core', 'stage_abnormal_boundary'],
      gameData.tutorialUnlocks,
    )
    const coreRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      coreUnlocks,
    ).map((card) => card.id)
    const abnormalRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      abnormalUnlocks,
    ).map((card) => card.id)

    expect(coreRewardIds).toEqual(
      expect.not.arrayContaining([
        'card_thunder_splinter',
        'card_name_hook_charm',
        'card_heavy_edict',
      ]),
    )
    expect(coreRewardIds).not.toContain('card_mirror_slip')
    expect(abnormalRewardIds).not.toContain('card_counterforce_talisman')
    expect(abnormalRewardIds).toEqual(
      expect.arrayContaining(['card_joint_seal_tablet']),
    )
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
    expect(rewardedRun.deckCards.map((card) => card.definitionId)).toEqual([
      ...run.deckDefinitionIds,
      selectedCard,
    ])
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
    expect(skippedRun.deckCards).toEqual(run.deckCards)
    expect(skippedRun.rewards[0]).toEqual(
      expect.objectContaining({
        skipped: true,
        selectedCardDefinitionId: undefined,
      }),
    )
  })
})
