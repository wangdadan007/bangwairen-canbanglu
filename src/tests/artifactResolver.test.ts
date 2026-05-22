import { describe, expect, it } from 'vitest'
import {
  advanceArtifactProgress,
  advanceArtifactsAfterBattle,
  createInitialBattleState,
  createInitialArtifactCollection,
  createInitialTutorialRunState,
  createTutorialArtifactOfferIfNeeded,
  reduceBattleState,
  RED_INK_OPTIONS,
  LIANJIN_ROLE_ID,
  resolveArtifactBacklashesAtBattleStart,
  resolveTutorialArtifactOffer,
  resolveTutorialRedInk,
  resolveTutorialVerdict,
  advanceTutorialRun,
  ZHAOWEI_ROLE_ID,
  type BattleReducerContext,
} from '../core'
import { gameData } from '../data'
import type { EnemyDefinition } from '../types'

const battleContext: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T17 artifact foundation', () => {
  it('creates starter artifact offer as a three-choice out-of-deck pickup', () => {
    const run = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      undefined,
      undefined,
      gameData.artifacts,
    )
    const deckIds = new Set(run.deckDefinitionIds)
    const offerRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts)
    const chosenRun = resolveTutorialArtifactOffer(
      offerRun,
      'artifact_whip_fragment',
      gameData.artifacts,
    )
    const artifactIds = chosenRun.artifacts.artifacts.map((artifact) => artifact.definitionId)

    expect(run.artifacts.artifacts).toEqual([])
    expect(offerRun.pendingArtifactOffer?.stage).toBe('starter')
    expect(offerRun.pendingArtifactOffer?.options.map((option) => option.artifactDefinitionId)).toEqual([
      'artifact_whip_fragment',
      'artifact_bone_mirror',
      'artifact_court_chime',
    ])
    expect(artifactIds).toEqual(['artifact_whip_fragment'])
    expect(artifactIds.every((artifactId) => !deckIds.has(artifactId))).toBe(true)
    expect(chosenRun.artifacts.artifacts[0]?.bindingStatus).toBe('unbound')
    expect(chosenRun.artifactOfferRecords[0]).toEqual({
      id: 'artifact_offer_record_1',
      stage: 'starter',
      offeredArtifactDefinitionIds: [
        'artifact_whip_fragment',
        'artifact_bone_mirror',
        'artifact_court_chime',
      ],
      selectedArtifactDefinitionId: 'artifact_whip_fragment',
    })
  })

  it('creates mid-chapter and boss-clear artifact offers at fixed chapter checkpoints', () => {
    let run = createInitialTutorialRunState(gameData.tutorialUnlocks, [
      'encounter_tutorial_paper_wraith',
      'encounter_elite_incense_clerk',
      'encounter_boss_registry_thief',
    ])

    run = resolveTutorialArtifactOffer(
      createTutorialArtifactOfferIfNeeded(run, gameData.artifacts),
      'artifact_bone_mirror',
      gameData.artifacts,
    )
    run = advanceTutorialRun(run, gameData.encounters, gameData.tutorialUnlocks, 'vanquish')
    run = advanceTutorialRun(run, gameData.encounters, gameData.tutorialUnlocks, 'vanquish')

    const midOfferRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts)

    expect(midOfferRun.pendingArtifactOffer?.stage).toBe('mid_chapter')
    expect(midOfferRun.pendingArtifactOffer?.options.map((option) => option.artifactDefinitionId)).toEqual([
      'artifact_cinnabar_dou',
      'artifact_seal_door_tablet',
      'artifact_registry_inkstone',
    ])

    run = resolveTutorialArtifactOffer(
      midOfferRun,
      'artifact_cinnabar_dou',
      gameData.artifacts,
    )
    run = advanceTutorialRun(run, gameData.encounters, gameData.tutorialUnlocks, 'vanquish')

    const bossOfferRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts)

    expect(bossOfferRun.status).toBe('complete')
    expect(bossOfferRun.pendingArtifactOffer?.stage).toBe('boss_clear')
    expect(bossOfferRun.pendingArtifactOffer?.options.map((option) => option.artifactDefinitionId)).toEqual([
      'artifact_name_tether_spindle',
      'artifact_fracture_needle',
      'artifact_doom_bell',
    ])
  })

  it('orders T65 artifact offers around role and route build anchors', () => {
    let zhaoweiRun = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      [
        'encounter_tutorial_paper_wraith',
        'encounter_elite_incense_clerk',
        'encounter_boss_registry_thief',
      ],
      undefined,
      gameData.artifacts,
      ZHAOWEI_ROLE_ID,
    )
    zhaoweiRun = advanceTutorialRun(
      zhaoweiRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    zhaoweiRun = advanceTutorialRun(
      zhaoweiRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    const zhaoweiMidOfferRun = createTutorialArtifactOfferIfNeeded(
      zhaoweiRun,
      gameData.artifacts,
      {
        routeTendencyIds: ['catalogue', 'supply'],
      },
    )

    expect(zhaoweiMidOfferRun.pendingArtifactOffer?.stage).toBe('mid_chapter')
    expect(zhaoweiMidOfferRun.pendingArtifactOffer?.options[0].artifactDefinitionId).toBe(
      'artifact_registry_inkstone',
    )

    let lianjinRun = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      [
        'encounter_tutorial_paper_wraith',
        'encounter_elite_incense_clerk',
        'encounter_boss_registry_thief',
      ],
      undefined,
      gameData.artifacts,
      LIANJIN_ROLE_ID,
    )
    lianjinRun = advanceTutorialRun(
      lianjinRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    lianjinRun = advanceTutorialRun(
      lianjinRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    const lianjinMidOfferRun = createTutorialArtifactOfferIfNeeded(
      lianjinRun,
      gameData.artifacts,
      {
        routeTendencyIds: ['fracture', 'high_pressure'],
      },
    )
    lianjinRun = resolveTutorialArtifactOffer(
      lianjinMidOfferRun,
      'artifact_seal_door_tablet',
      gameData.artifacts,
    )
    lianjinRun = advanceTutorialRun(
      lianjinRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    const lianjinBossOfferRun = createTutorialArtifactOfferIfNeeded(
      lianjinRun,
      gameData.artifacts,
      {
        routeTendencyIds: ['fracture', 'high_pressure'],
      },
    )

    expect(lianjinMidOfferRun.pendingArtifactOffer?.options[0].artifactDefinitionId).toBe(
      'artifact_seal_door_tablet',
    )
    expect(lianjinBossOfferRun.pendingArtifactOffer?.options.map((option) => option.artifactDefinitionId)).toEqual([
      'artifact_fracture_needle',
      'artifact_doom_bell',
      'artifact_ash_lamp',
    ])
  })

  it('binds artifacts when their progress condition is met', () => {
    const artifacts = createInitialArtifactCollection(gameData.artifacts)
    const progressed = advanceArtifactProgress(artifacts, [
      {
        kind: 'ask_name',
        amount: 8,
      },
    ])
    const mirror = progressed.artifacts.find(
      (artifact) => artifact.definitionId === 'artifact_bone_mirror',
    )
    const whip = progressed.artifacts.find(
      (artifact) => artifact.definitionId === 'artifact_whip_fragment',
    )

    expect(mirror?.bindingStatus).toBe('bound')
    expect(mirror?.bindProgress).toBe(8)
    expect(whip?.bindingStatus).toBe('unbound')
  })

  it('records overload windows without resolving full backlash yet', () => {
    const artifacts = createInitialArtifactCollection(gameData.artifacts)
    const firstWindow = advanceArtifactsAfterBattle(artifacts, {
      vanquishNamedEnemyBeforeNamedCount: 1,
    })
    const secondWindow = advanceArtifactsAfterBattle(firstWindow, {
      vanquishNamedEnemyBeforeNamedCount: 1,
    })
    const whip = secondWindow.artifacts.find(
      (artifact) => artifact.definitionId === 'artifact_whip_fragment',
    )

    expect(whip?.consecutiveOverloadBattles).toBe(2)
    expect(whip?.pendingBacklash).toBe(true)
  })

  it('resolves pending whip backlash into a temporary opening-hand card', () => {
    const artifacts = createInitialArtifactCollection(gameData.artifacts)
    const firstWindow = advanceArtifactsAfterBattle(artifacts, {
      vanquishNamedEnemyBeforeNamedCount: 1,
    })
    const secondWindow = advanceArtifactsAfterBattle(firstWindow, {
      vanquishNamedEnemyBeforeNamedCount: 1,
    })
    const resolution = resolveArtifactBacklashesAtBattleStart(secondWindow, {
      ink: 0,
      doom: 0,
      fracture: 0,
    })
    const battle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      artifacts: resolution.artifacts,
      resources: resolution.resources,
      extraHandDefinitionIds: resolution.extraHandDefinitionIds,
      artifactBacklashRecords: resolution.records,
    })

    expect(resolution.extraHandDefinitionIds).toEqual(['card_cracked_whip_echo'])
    expect(
      resolution.artifacts.artifacts.find(
        (artifact) => artifact.definitionId === 'artifact_whip_fragment',
      )?.pendingBacklash,
    ).toBe(false)
    expect(battle.hand.map((card) => card.definitionId)).toContain('card_cracked_whip_echo')
    expect(battle.actionLog.map((entry) => entry.type)).toContain('ARTIFACT_BACKLASH_TRIGGERED')
  })

  it('applies whip fragment bonus after the first naming in a battle', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_ask_name', 'card_ask_name', 'card_zhu_fu'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
    })
    const firstAsk = getHandCard(state, 'card_ask_name')
    const afterFirstAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const secondAsk = getHandCard(afterFirstAsk, 'card_ask_name')
    const afterSecondAsk = reduceBattleState(
      afterFirstAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: secondAsk.instanceId,
        targetEnemyInstanceId: afterFirstAsk.enemies[0].instanceId,
      },
      battleContext,
    )
    const zhuFu = getHandCard(afterSecondAsk, 'card_zhu_fu')
    const afterBreak = reduceBattleState(
      afterSecondAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: afterSecondAsk.enemies[0].instanceId,
      },
      battleContext,
    )

    expect(afterSecondAsk.pendingArtifactBreakShapeBonus).toEqual({
      artifactId: 'artifact_whip_fragment',
      amount: 2,
    })
    expect(afterBreak.pendingArtifactBreakShapeBonus).toBeUndefined()
    expect(afterBreak.enemies[0].currentForm).toBe(5)
    expect(afterBreak.actionLog.map((entry) => entry.type)).toContain('ARTIFACT_TRIGGERED')
  })

  it('triggers bone mirror after the first ask-name action in a battle', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_ask_name'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
    })
    const askName = getHandCard(state, 'card_ask_name')
    const afterAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const mirrorLog = afterAsk.actionLog.find(
      (entry) =>
        entry.type === 'ARTIFACT_TRIGGERED' &&
        entry.sourceId === 'artifact_bone_mirror',
    )

    expect(mirrorLog?.payload).toEqual(
      expect.objectContaining({
        effectType: 'peek_intent_after_ask_name',
        result: 'peeked',
        intentId: 'intent_paper_wraith_scrape',
      }),
    )
    expect(
      afterAsk.artifacts.artifacts.find(
        (artifact) => artifact.definitionId === 'artifact_bone_mirror',
      )?.triggerCountThisBattle,
    ).toBe(1)
  })

  it('triggers T49A ask-name artifacts only after their unlock stages are visible', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_ask_name'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
      unlocks: {
        stages: ['stage_core', 'stage_abnormal_boundary'],
        keywords: ['break_form', 'ask_name', 'intent', 'seal_momentum'],
      },
    })
    const askName = getHandCard(state, 'card_ask_name')
    const afterAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const artifactLogSourceIds = afterAsk.actionLog
      .filter((entry) => entry.type === 'ARTIFACT_TRIGGERED')
      .map((entry) => entry.sourceId)

    expect(artifactLogSourceIds).toContain('artifact_bone_mirror')
    expect(artifactLogSourceIds).toContain('artifact_court_chime')
    expect(artifactLogSourceIds).not.toContain('artifact_name_tether_spindle')
    expect(
      afterAsk.artifacts.artifacts.find(
        (artifact) => artifact.definitionId === 'artifact_court_chime',
      )?.triggerCountThisBattle,
    ).toBe(1)
  })

  it('applies T54 ask-name artifact rewards as seal momentum and ink gain', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_ask_name'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
      unlocks: {
        stages: ['stage_core', 'stage_abnormal_boundary', 'stage_run_resources'],
        keywords: ['break_form', 'ask_name', 'intent', 'seal_momentum', 'ink'],
      },
    })
    const askName = getHandCard(state, 'card_ask_name')
    const afterAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const courtChimeLog = afterAsk.actionLog.find(
      (entry) =>
        entry.type === 'ARTIFACT_TRIGGERED' &&
        entry.sourceId === 'artifact_court_chime',
    )
    const registryInkstoneLog = afterAsk.actionLog.find(
      (entry) =>
        entry.type === 'ARTIFACT_TRIGGERED' &&
        entry.sourceId === 'artifact_registry_inkstone',
    )

    expect(afterAsk.enemies[0].incomingForce).toBe(state.enemies[0].incomingForce - 1)
    expect(afterAsk.resources.ink).toBe(1)
    expect(courtChimeLog?.payload).toEqual(
      expect.objectContaining({
        effectType: 'seal_momentum_after_ask_name',
        result: 'sealed',
        amount: 1,
      }),
    )
    expect(registryInkstoneLog?.payload).toEqual(
      expect.objectContaining({
        effectType: 'gain_ink_after_ask_name',
        result: 'gain_ink',
        amount: 1,
        currentInk: 1,
      }),
    )
  })

  it('shows the late T49A name tether spindle as an actual ask-name feedback artifact', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_ask_name'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
      unlocks: {
        stages: [
          'stage_core',
          'stage_abnormal_boundary',
          'stage_run_resources',
          'stage_three_altars',
        ],
        keywords: ['break_form', 'ask_name', 'intent', 'seal_momentum', 'ink', 'altar'],
      },
    })
    const askName = getHandCard(state, 'card_ask_name')
    const afterAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const nameTetherLog = afterAsk.actionLog.find(
      (entry) =>
        entry.type === 'ARTIFACT_TRIGGERED' &&
        entry.sourceId === 'artifact_name_tether_spindle',
    )

    expect(nameTetherLog?.payload).toEqual(
      expect.objectContaining({
        effectType: 'peek_intent_after_ask_name',
        result: 'peeked',
        intentKind: 'incoming_force',
      }),
    )
    expect(
      afterAsk.artifacts.artifacts.find(
        (artifact) => artifact.definitionId === 'artifact_name_tether_spindle',
      )?.triggerCountThisBattle,
    ).toBe(1)
  })

  it('uses fracture needle to improve erase verdict card rewards', () => {
    const initialRun = createRunWithAllArtifacts()
    const afterBattle = advanceTutorialRun(
      initialRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(gameData.enemies[0]),
    )
    const afterErase = resolveTutorialVerdict(afterBattle, 'erase')

    expect(afterErase.deckDefinitionIds.slice(-2)).toEqual([
      'card_split_form_talisman',
      'card_split_form_talisman',
    ])
    expect(afterErase.deckCards.slice(-2).map((card) => card.definitionId)).toEqual([
      'card_split_form_talisman',
      'card_split_form_talisman',
    ])
    expect(afterErase.verdict.records[0]?.addedCardDefinitionIds).toEqual([
      'card_split_form_talisman',
      'card_split_form_talisman',
    ])
  })

  it('advances artifact progress from battle, red ink, and erase verdict records', () => {
    const initialRun = createRunWithAllArtifacts()
    const afterBattle = advanceTutorialRun(
      initialRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(gameData.enemies[0]),
      {
        askNameCount: 2,
        catalogueNamedEnemyCount: 1,
      },
    )
    const afterVerdict = resolveTutorialVerdict(afterBattle, 'red_ink')
    const afterRedInk = resolveTutorialRedInk(afterVerdict, {
      deckCardId: afterVerdict.deckCards[0].id,
      annotationId: 'red_ink_return_incense',
    })
    const afterSecondCatalogue = advanceTutorialRun(
      {
        ...afterRedInk,
        pendingReward: undefined,
      },
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(gameData.enemies[1]),
      {
        askNameCount: 2,
        catalogueNamedEnemyCount: 1,
      },
    )
    const afterErase = resolveTutorialVerdict(afterSecondCatalogue, 'erase')

    expect(getArtifactProgress(afterErase, 'artifact_whip_fragment')).toBe(2)
    expect(getArtifactProgress(afterErase, 'artifact_bone_mirror')).toBe(4)
    expect(getArtifactProgress(afterErase, 'artifact_cinnabar_dou')).toBe(1)
    expect(getArtifactProgress(afterErase, 'artifact_fracture_needle')).toBe(1)
  })

  it('applies cinnabar dou as an extra red-ink annotation without entering the deck', () => {
    const initialRun = createRunWithAllArtifacts()
    const runWithRedInkOffer = {
      ...initialRun,
      pendingRedInk: {
        id: 'red_ink_offer_test',
        options: RED_INK_OPTIONS,
      },
    }
    const afterRedInk = resolveTutorialRedInk(runWithRedInkOffer, {
      deckCardId: runWithRedInkOffer.deckCards[0].id,
      annotationId: 'red_ink_return_incense',
    })
    const targetCard = afterRedInk.deckCards[0]
    const deckIds = new Set(afterRedInk.deckDefinitionIds)

    expect(targetCard.annotations.map((annotation) => annotation.id)).toEqual([
      'red_ink_return_incense',
      'red_ink_cinnabar_base_bonus',
    ])
    expect(deckIds.has('artifact_cinnabar_dou')).toBe(false)
    expect(getArtifactProgress(afterRedInk, 'artifact_cinnabar_dou')).toBe(1)
  })
})

function getHandCard(state: ReturnType<typeof createInitialBattleState>, cardDefinitionId: string) {
  const card = state.hand.find((candidate) => candidate.definitionId === cardDefinitionId)

  if (!card) {
    throw new Error(`Missing hand card: ${cardDefinitionId}`)
  }

  return card
}

function getArtifactProgress(run: ReturnType<typeof createInitialTutorialRunState>, artifactId: string) {
  const artifact = run.artifacts.artifacts.find((candidate) => candidate.definitionId === artifactId)

  if (!artifact) {
    throw new Error(`Missing artifact state: ${artifactId}`)
  }

  return artifact.bindProgress
}

function createRunWithAllArtifacts() {
  return {
    ...createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      undefined,
      undefined,
      gameData.artifacts,
    ),
    artifacts: createInitialArtifactCollection(gameData.artifacts),
  }
}

function createVerdictContext(enemy: EnemyDefinition) {
  return {
    enemyDefinitionId: enemy.id,
    enemyNameKey: enemy.nameKey,
    revealedNameKeys: enemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
  }
}
