import { describe, expect, it } from 'vitest'
import {
  addIncenseSealToState,
  advanceTutorialRun,
  createInitialBattleState,
  createInitialIncenseSealState,
  createInitialTutorialRunState,
  reduceBattleState,
  resolveTutorialIncenseSealOffer,
} from '../core'
import { gameData } from '../data'

describe('T83 incense seal resolver', () => {
  it('stores incense seals in two tactical slots and replaces the earliest seal when full', () => {
    const first = addIncenseSealToState(
      createInitialIncenseSealState(),
      'seal_guard_name',
      'event',
    )
    const second = addIncenseSealToState(first, 'seal_clean_scroll', 'shop')
    const third = addIncenseSealToState(second, 'seal_suppress_force', 'elite')

    expect(third.seals.map((seal) => seal.definitionId)).toEqual([
      'seal_suppress_force',
      'seal_clean_scroll',
    ])
    expect(third.records.map((record) => record.result)).toEqual([
      'gained',
      'gained',
      'replaced',
    ])
  })

  it('offers incense seals after elite encounters and records the selected option', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks, [
      'encounter_elite_incense_clerk',
      'encounter_tutorial_paper_wraith',
    ])
    const advancedRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
      gameData.cards,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gameData.incenseSeals,
    )
    const selectedSealId = advancedRun.pendingIncenseSealOffer?.options[0]?.incenseSealDefinitionId

    if (!selectedSealId) {
      throw new Error('Expected elite incense seal offer')
    }

    const resolvedRun = resolveTutorialIncenseSealOffer(advancedRun, selectedSealId)

    expect(resolvedRun.pendingIncenseSealOffer).toBeUndefined()
    expect(resolvedRun.incenseSeals.seals.map((seal) => seal.definitionId)).toContain(
      selectedSealId,
    )
    expect(resolvedRun.incenseSealOfferRecords[0]).toEqual(
      expect.objectContaining({
        encounterId: 'encounter_elite_incense_clerk',
        selectedIncenseSealDefinitionId: selectedSealId,
        skipped: false,
      }),
    )
  })

  it('uses a battle incense seal once, applies the effect, and removes it from the slot', () => {
    const state = createBattleWithSeal(
      'enemy_bronze_bell_patrol',
      'intent_bronze_bell_patrol_sweep',
      'seal_suppress_force',
    )
    const target = state.enemies[0]

    const nextState = reduceBattleState(
      state,
      {
        type: 'USE_INCENSE_SEAL',
        incenseSealInstanceId: state.incenseSeals.seals[0].id,
        targetEnemyInstanceId: target.instanceId,
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
        incenseSealDefinitions: gameData.incenseSeals,
      },
    )

    expect(nextState.incenseSeals.seals).toHaveLength(0)
    expect(nextState.enemies[0].incomingForce).toBe(0)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['INCOMING_FORCE_SEALED', 'INCENSE_SEAL_USED']),
    )
  })

  it('prepares a current abnormal move counter through a one-shot incense seal', () => {
    const state = createBattleWithSeal(
      'enemy_scroll_stuffer_clerk',
      'intent_scroll_stuffer_clerk_stuff_scroll',
      'seal_counter_abnormal',
    )
    const target = state.enemies[0]

    const nextState = reduceBattleState(
      state,
      {
        type: 'USE_INCENSE_SEAL',
        incenseSealInstanceId: state.incenseSeals.seals[0].id,
        targetEnemyInstanceId: target.instanceId,
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
        incenseSealDefinitions: gameData.incenseSeals,
      },
    )

    expect(nextState.incenseSeals.seals).toHaveLength(0)
    expect(nextState.enemies[0].blockedAbnormalMoveTypes).toContain('add_fouled_scroll')
    expect(nextState.actionLog.some((entry) => entry.type === 'ABNORMAL_MOVE_COUNTERED')).toBe(true)
  })
})

function createBattleWithSeal(
  enemyDefinitionId: string,
  initialIntentId: string,
  sealDefinitionId: Parameters<typeof addIncenseSealToState>[1],
) {
  const enemyDefinition = gameData.enemies.find((enemy) => enemy.id === enemyDefinitionId)

  if (!enemyDefinition) {
    throw new Error(`Missing enemy: ${enemyDefinitionId}`)
  }

  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition,
    deckDefinitionIds: ['card_zhu_fu', 'card_zhu_fu', 'card_ask_name'],
    initialEnemyIntentIds: {
      [enemyDefinitionId]: initialIntentId,
    },
    incenseSeals: addIncenseSealToState(
      createInitialIncenseSealState(),
      sealDefinitionId,
      'shop',
    ),
    openingDrawCount: 0,
  })
}
