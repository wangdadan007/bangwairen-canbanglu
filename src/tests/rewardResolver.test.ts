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
      'ordinary',
    )

    expect(beforeRedInk.options.map((option) => option.cardDefinitionId)).not.toContain(
      'card_red_ink_trial',
    )
    expect(afterRedInk.map((card) => card.id)).toContain('card_red_ink_trial')
    expect(afterRedInk.map((card) => card.id)).not.toContain('card_ink_rubbing_slip')
    expect(getAvailableTutorialRewardCards(
      gameData.cards,
      resourceUnlocks,
      'ordinary',
    ).map((card) => card.id)).toEqual(
      expect.arrayContaining([
        'card_ink_rubbing_slip',
        'card_borrowed_doom_talisman',
        'card_clean_scroll_charm',
      ]),
    )
  })

  it('keeps T37 and T38 card additions gated by stage and reward quality', () => {
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
    const resourceOrdinaryIds = getAvailableTutorialRewardCards(
      gameData.cards,
      resourceUnlocks,
      'ordinary',
    ).map((card) => card.id)
    const altarOrdinaryIds = getAvailableTutorialRewardCards(
      gameData.cards,
      altarUnlocks,
      'ordinary',
    ).map((card) => card.id)
    const altarHighIds = getAvailableTutorialRewardCards(
      gameData.cards,
      altarUnlocks,
      'high',
    ).map((card) => card.id)

    expect(resourceOrdinaryIds).toEqual(
      expect.arrayContaining([
        'card_clean_scroll_charm',
        'card_doom_account_tally',
        'card_fracture_guard_talisman',
      ]),
    )
    expect(resourceOrdinaryIds).not.toContain('card_name_net_talisman')
    expect(altarOrdinaryIds).toEqual(
      expect.arrayContaining([
        'card_name_net_talisman',
        'card_ash_lamp_counterseal',
        'card_altar_threefold_sigil',
      ]),
    )
    expect(altarHighIds).toEqual(
      expect.arrayContaining([
        'card_mirror_bind_edict',
        'card_whip_follow_charm',
        'card_registry_rewrite_edict',
        'card_heaven_ink_decree',
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
    expect(hengjianOffer.options[0].cardDefinitionId).toBe('card_trace_name_slip')
    expect(zhaoweiOffer.options[0].cardDefinitionId).toBe('card_heaven_altar_oracle')
    expect(lianjinOffer.options[0].cardDefinitionId).toBe('card_registry_rewrite_edict')
  })

  it('keeps the expanded T15 card pool gated by tutorial unlocks', () => {
    const coreUnlocks = createUnlockState(['stage_core'], gameData.tutorialUnlocks)
    const abnormalUnlocks = createUnlockState(
      ['stage_core', 'stage_abnormal_boundary'],
      gameData.tutorialUnlocks,
    )
    const coreHighRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      coreUnlocks,
      'high',
    ).map((card) => card.id)
    const coreOrdinaryRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      coreUnlocks,
      'ordinary',
    ).map((card) => card.id)
    const abnormalRewardIds = getAvailableTutorialRewardCards(
      gameData.cards,
      abnormalUnlocks,
      'ordinary',
    ).map((card) => card.id)

    expect(coreHighRewardIds).toEqual(
      expect.arrayContaining([
        'card_thunder_splinter',
        'card_name_hook_charm',
        'card_heavy_edict',
      ]),
    )
    expect(coreOrdinaryRewardIds).not.toContain('card_mirror_slip')
    expect(abnormalRewardIds).toEqual(
      expect.arrayContaining(['card_counterforce_talisman', 'card_joint_seal_tablet']),
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
