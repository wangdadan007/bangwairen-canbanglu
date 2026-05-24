import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialBattleState,
  createInitialTutorialRunState,
  reduceBattleState,
  resolveTutorialVerdict,
} from '../core'
import { gameData } from '../data'
import type { EnemyDefinition } from '../types'

describe('T12 verdict MVP', () => {
  it('creates a verdict offer only after catalogue settlement with a named target', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const paperWraith = gameData.enemies[0]
    const catalogueRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(paperWraith),
    )
    const vanquishRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
      gameData.cards,
      createVerdictContext(paperWraith),
    )

    expect(catalogueRun.pendingVerdict).toEqual(
      expect.objectContaining({
        encounterId: 'encounter_tutorial_paper_wraith',
        enemyDefinitionId: 'enemy_paper_wraith',
        options: expect.arrayContaining([
          expect.objectContaining({ id: 'register', choiceId: 'register' }),
          expect.objectContaining({ id: 'red_ink', choiceId: 'red_ink' }),
          expect.objectContaining({ id: 'erase', choiceId: 'erase' }),
          expect.objectContaining({ id: 'erase_gain_ink', choiceId: 'erase' }),
          expect.objectContaining({ id: 'erase_heavy_split_form', choiceId: 'erase' }),
          expect.objectContaining({ id: 'erase_next_battle_resources', choiceId: 'erase' }),
        ]),
      }),
    )
    expect(catalogueRun.pendingVerdict?.revealedNameKeys).toEqual([
      'enemy.paper_wraith.name_slot.0',
      'enemy.paper_wraith.name_slot.1',
    ])
    expect(vanquishRun.pendingVerdict).toBeUndefined()
  })

  it('does not offer next-battle erase payoff after the final encounter', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks, [
      'encounter_boss_registry_thief',
    ])
    const boss = gameData.enemies.find((enemy) => enemy.id === 'enemy_registry_thief')!
    const catalogueRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(boss),
    )

    expect(catalogueRun.pendingVerdict?.options.map((option) => option.id)).not.toContain(
      'erase_next_battle_resources',
    )
  })

  it('does not offer duplicate ordinary register in the same segment', () => {
    const initialRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const runWithCommonDocket = {
      ...initialRun,
      verdict: {
        ...initialRun.verdict,
        registerEntries: [
          {
            ...createRegisterEntry('register_common_docket'),
            maxTriggerCount: 3,
            remainingTriggerCount: 2,
          },
        ],
      },
    }
    const paperWraith = gameData.enemies[0]
    const catalogueRun = advanceTutorialRun(
      runWithCommonDocket,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(paperWraith),
    )
    const optionIds = catalogueRun.pendingVerdict?.options.map((option) => option.id)

    expect(optionIds).not.toContain('register')
    expect(optionIds).toContain('red_ink')
  })

  it('resolves ordinary register as a common narrow trigger instead of stat growth', () => {
    const run = createVerdictRun()
    const nextRun = resolveTutorialVerdict(run, 'register')
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckDefinitionIds: ['card_ask_name', 'card_ask_name'],
      maxIncenseBonus: nextRun.verdict.maxIncenseBonus,
      playerCurrentForm: nextRun.playerForm.current,
      playerMaxForm: nextRun.playerForm.max,
      unlocks: nextRun.unlocks,
      registerEntries: nextRun.verdict.registerEntries,
    })

    expect(nextRun.pendingVerdict).toBeUndefined()
    expect(nextRun.verdict.maxIncenseBonus).toBe(0)
    expect(nextRun.resources.fracture).toBe(0)
    expect(nextRun.verdict.registerEntries).toEqual([
      expect.objectContaining({
        encounterId: 'encounter_tutorial_paper_wraith',
        enemyDefinitionId: 'enemy_paper_wraith',
        registerRuleId: 'register_common_docket',
        ruleNameKey: 'verdict.register.rule.common_docket.name',
        maxTriggerCount: 3,
        remainingTriggerCount: 3,
      }),
    ])
    expect(nextRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        choiceId: 'register',
        registerRuleId: 'register_common_docket',
        maxIncenseBonusDelta: 0,
        maxFormBonusDelta: 0,
      }),
    )
    expect(nextRun.playerForm).toEqual({
      current: 72,
      max: 72,
    })
    expect(state.player.maxIncense).toBe(3)
    expect(state.player.incense).toBe(3)
    expect(state.player.maxForm).toBe(72)

    const afterFirstAsk = playFirstCard(state)
    const afterSecondAsk = playFirstCard(afterFirstAsk)

    expect(afterSecondAsk.resources.ink).toBe(1)
    expect(afterSecondAsk.actionLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REGISTER_RULE_TRIGGERED',
          payload: expect.objectContaining({
            ruleId: 'register_common_docket',
            trigger: 'enemy_named',
            inkDelta: 1,
            remainingTriggerCount: 2,
          }),
        }),
      ]),
    )
    expect(afterSecondAsk.registerEntries[0]).toEqual(
      expect.objectContaining({
        registerRuleId: 'register_common_docket',
        remainingTriggerCount: 2,
      }),
    )
  })

  it('resolves elite and boss register as dedicated rules instead of generic stat bonuses', () => {
    const eliteRun = createVerdictRun(gameData.enemies.find((enemy) => enemy.id === 'enemy_incense_clerk')!)
    const eliteRegisterRun = resolveTutorialVerdict(eliteRun, 'register')
    const bossRun = createVerdictRun(gameData.enemies.find((enemy) => enemy.id === 'enemy_registry_thief')!)
    const bossRegisterRun = resolveTutorialVerdict(bossRun, 'register')

    expect(eliteRegisterRun.verdict.maxIncenseBonus).toBe(0)
    expect(eliteRegisterRun.playerForm.max).toBe(72)
    expect(eliteRegisterRun.verdict.registerEntries[0]).toEqual(
      expect.objectContaining({
        registerRuleId: 'register_incense_clerk',
        ruleNameKey: 'verdict.register.rule.incense_clerk.name',
      }),
    )
    expect(bossRegisterRun.verdict.registerEntries[0]).toEqual(
      expect.objectContaining({
        registerRuleId: 'register_registry_thief',
        ruleNameKey: 'verdict.register.rule.registry_thief.name',
      }),
    )
  })

  it('resolves red ink by entering the red ink page before reward selection', () => {
    const run = createVerdictRun()
    const nextRun = resolveTutorialVerdict(run, 'red_ink')

    expect(nextRun.pendingVerdict).toBeUndefined()
    expect(nextRun.pendingRedInk?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'red_ink_return_incense',
        'red_ink_trace_name',
        'red_ink_named_draw',
        'red_ink_press_momentum',
      ]),
    )
    expect(nextRun.pendingReward).toBeDefined()
    expect(nextRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        choiceId: 'red_ink',
      }),
    )
  })

  it('resolves erase by adding fracture and a minimal card reward', () => {
    const run = createVerdictRun()
    const nextRun = resolveTutorialVerdict(run, 'erase')

    expect(nextRun.pendingVerdict).toBeUndefined()
    expect(nextRun.resources.fracture).toBe(1)
    expect(nextRun.deckDefinitionIds.slice(-1)).toEqual(['card_split_form_talisman'])
    expect(nextRun.deckCards[nextRun.deckCards.length - 1]?.definitionId).toBe(
      'card_split_form_talisman',
    )
    expect(nextRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        choiceId: 'erase',
        fractureDelta: 1,
        addedCardDefinitionId: 'card_split_form_talisman',
        nextBattleStartBonus: {
          ink: 0,
          incense: 0,
          openingHandCardDefinitionIds: ['card_split_form_talisman'],
        },
      }),
    )

    const nextBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckCards: nextRun.deckCards,
      openingHandDefinitionIds: nextRun.nextBattleStartBonus?.openingHandCardDefinitionIds,
    })

    expect(nextBattle.hand.map((card) => card.definitionId)).toContain('card_split_form_talisman')
  })

  it('resolves the first chapter erase payoff variants', () => {
    const inkRun = resolveTutorialVerdict(createVerdictRun(), 'erase_gain_ink')
    const heavyRun = resolveTutorialVerdict(createVerdictRun(), 'erase_heavy_split_form')
    const nextBattleRun = resolveTutorialVerdict(createVerdictRun(), 'erase_next_battle_resources')

    expect(inkRun.resources).toEqual({
      ink: 2,
      doom: 0,
      fracture: 1,
    })
    expect(inkRun.deckDefinitionIds).not.toContain('card_split_form_talisman')
    expect(inkRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        choiceId: 'erase',
        eraseVariantId: 'erase_gain_ink',
        inkDelta: 2,
      }),
    )
    expect(heavyRun.resources).toEqual({
      ink: 0,
      doom: 1,
      fracture: 1,
    })
    expect(heavyRun.deckDefinitionIds.slice(-1)).toEqual(['card_heavy_split_form_talisman'])
    expect(heavyRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        eraseVariantId: 'erase_heavy_split_form',
        doomDelta: 1,
        nextBattleStartBonus: {
          ink: 0,
          incense: 0,
          openingHandCardDefinitionIds: ['card_heavy_split_form_talisman'],
        },
      }),
    )
    expect(nextBattleRun.resources.fracture).toBe(1)
    expect(nextBattleRun.nextBattleStartBonus).toEqual({
      ink: 1,
      incense: 2,
      openingHandCardDefinitionIds: [],
    })
    expect(nextBattleRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        eraseVariantId: 'erase_next_battle_resources',
        nextBattleStartBonus: {
          ink: 1,
          incense: 2,
        },
      }),
    )
  })

  it('spends common docket triggers across battles and stops at the segment cap', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckDefinitionIds: ['card_ask_name'],
      registerEntries: [
        {
          ...createRegisterEntry('register_common_docket'),
          remainingTriggerCount: 1,
          maxTriggerCount: 3,
        },
      ],
    })
    const afterAsk = playFirstCard(state)
    const exhaustedState = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckDefinitionIds: ['card_ask_name'],
      registerEntries: afterAsk.registerEntries,
    })
    const afterExhaustedAsk = playFirstCard(exhaustedState)

    expect(afterAsk.resources.ink).toBe(1)
    expect(afterAsk.registerEntries[0]).toEqual(
      expect.objectContaining({
        remainingTriggerCount: 0,
      }),
    )
    expect(afterExhaustedAsk.resources.ink).toBe(0)
    expect(afterExhaustedAsk.actionLog).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REGISTER_RULE_TRIGGERED',
          payload: expect.objectContaining({
            ruleId: 'register_common_docket',
          }),
        }),
      ]),
    )
  })

  it('applies dedicated register rules during battle', () => {
    const incenseState = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies.find((enemy) => enemy.id === 'enemy_incense_thief_mouse'),
      deckDefinitionIds: ['card_cut_supply_talisman'],
      registerEntries: [createRegisterEntry('register_incense_clerk')],
    })
    const afterCounterPrepared = reduceBattleState(
      incenseState,
      {
        type: 'PLAY_CARD',
        cardInstanceId: incenseState.hand[0].instanceId,
        targetEnemyInstanceId: incenseState.enemies[0].instanceId,
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
      },
    )

    expect(afterCounterPrepared.resources.ink).toBe(0)

    const afterCounter = reduceBattleState(
      afterCounterPrepared,
      {
        type: 'END_TURN',
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
      },
    )

    expect(afterCounter.resources.ink).toBe(1)
    expect(afterCounter.player.incense).toBe(4)
    expect(afterCounter.actionLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REGISTER_RULE_TRIGGERED',
          payload: expect.objectContaining({
            ruleId: 'register_incense_clerk',
            trigger: 'counter_abnormal',
          }),
        }),
      ]),
    )

    const fireState = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies.find((enemy) => enemy.id === 'enemy_paper_wraith'),
      deckDefinitionIds: ['card_ask_name', 'card_ask_name', 'card_zhu_fu'],
      registerEntries: [createRegisterEntry('register_fire_fleeing_name')],
    })
    const afterFirstAsk = playFirstCard(fireState)
    const afterSecondAsk = playFirstCard(afterFirstAsk)
    const afterBreak = playFirstCard(afterSecondAsk)

    expect(afterBreak.enemies[0].currentForm).toBe(4)
    expect(afterBreak.actionLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REGISTER_RULE_TRIGGERED',
          payload: expect.objectContaining({
            ruleId: 'register_fire_fleeing_name',
            trigger: 'break_bonus_consumed',
            breakShapeBonus: 3,
          }),
        }),
      ]),
    )

    const altarState = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies.find((enemy) => enemy.id === 'enemy_paper_wraith'),
      deckDefinitionIds: ['card_ask_name', 'card_human_altar_name_sigil'],
      registerEntries: [createRegisterEntry('register_dipper_empty_shell')],
    })
    const afterAsk = playFirstCard(altarState)
    const afterAltar = playFirstCard(afterAsk)
    const afterTurnEnd = reduceBattleState(
      afterAltar,
      {
        type: 'END_TURN',
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
      },
    )

    expect(afterAltar.resources.ink).toBe(1)
    expect(afterTurnEnd.actionLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REGISTER_RULE_TRIGGERED',
          payload: expect.objectContaining({
            ruleId: 'register_dipper_empty_shell',
            trigger: 'altar_triggered',
            drawCount: 1,
          }),
        }),
      ]),
    )
  })
})

function createVerdictRun(enemy: EnemyDefinition = gameData.enemies[0]) {
  return advanceTutorialRun(
    createInitialTutorialRunState(gameData.tutorialUnlocks),
    gameData.encounters,
    gameData.tutorialUnlocks,
    'catalogue',
    gameData.cards,
    createVerdictContext(enemy),
  )
}

function createVerdictContext(enemy: EnemyDefinition) {
  return {
    enemyDefinitionId: enemy.id,
    enemyNameKey: enemy.nameKey,
    revealedNameKeys: enemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
  }
}

function createRegisterEntry(registerRuleId: NonNullable<ReturnType<typeof resolveTutorialVerdict>['verdict']['registerEntries'][number]['registerRuleId']>) {
  return {
    id: `register_entry_${registerRuleId}`,
    encounterId: 'encounter_tutorial_paper_wraith',
    enemyDefinitionId: 'enemy_paper_wraith',
    enemyNameKey: 'enemy.paper_wraith.name',
    revealedNameKeys: [],
    registerRuleId,
  }
}

function playFirstCard(state: ReturnType<typeof createInitialBattleState>) {
  return reduceBattleState(
    state,
    {
      type: 'PLAY_CARD',
      cardInstanceId: state.hand[0].instanceId,
      targetEnemyInstanceId: state.enemies[0].instanceId,
    },
    {
      cardDefinitions: gameData.cards,
      enemyDefinitions: gameData.enemies,
    },
  )
}
