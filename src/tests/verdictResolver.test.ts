import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createInitialBattleState,
  createInitialTutorialRunState,
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
          expect.objectContaining({ id: 'register' }),
          expect.objectContaining({ id: 'red_ink' }),
          expect.objectContaining({ id: 'erase' }),
        ]),
      }),
    )
    expect(catalogueRun.pendingVerdict?.revealedNameKeys).toEqual([
      'enemy.paper_wraith.name_slot.0',
      'enemy.paper_wraith.name_slot.1',
    ])
    expect(vanquishRun.pendingVerdict).toBeUndefined()
  })

  it('resolves register as a persistent catalogue entry and max incense bonus', () => {
    const run = createVerdictRun()
    const nextRun = resolveTutorialVerdict(run, 'register')
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckCards: nextRun.deckCards,
      maxIncenseBonus: nextRun.verdict.maxIncenseBonus,
      playerCurrentForm: nextRun.playerForm.current,
      playerMaxForm: nextRun.playerForm.max,
      unlocks: nextRun.unlocks,
    })

    expect(nextRun.pendingVerdict).toBeUndefined()
    expect(nextRun.verdict.maxIncenseBonus).toBe(1)
    expect(nextRun.resources.fracture).toBe(0)
    expect(nextRun.verdict.registerEntries).toEqual([
      expect.objectContaining({
        encounterId: 'encounter_tutorial_paper_wraith',
        enemyDefinitionId: 'enemy_paper_wraith',
      }),
    ])
    expect(nextRun.verdict.records[0]).toEqual(
      expect.objectContaining({
        choiceId: 'register',
        maxIncenseBonusDelta: 1,
        maxFormBonusDelta: 4,
      }),
    )
    expect(nextRun.playerForm).toEqual({
      current: 76,
      max: 76,
    })
    expect(state.player.maxIncense).toBe(4)
    expect(state.player.incense).toBe(4)
    expect(state.player.maxForm).toBe(76)
  })

  it('resolves red ink by entering the red ink page before reward selection', () => {
    const run = createVerdictRun()
    const nextRun = resolveTutorialVerdict(run, 'red_ink')

    expect(nextRun.pendingVerdict).toBeUndefined()
    expect(nextRun.pendingRedInk?.options.map((option) => option.id)).toEqual([
      'red_ink_return_incense',
      'red_ink_trace_name',
    ])
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
      }),
    )
  })
})

function createVerdictRun() {
  return advanceTutorialRun(
    createInitialTutorialRunState(gameData.tutorialUnlocks),
    gameData.encounters,
    gameData.tutorialUnlocks,
    'catalogue',
    gameData.cards,
    createVerdictContext(gameData.enemies[0]),
  )
}

function createVerdictContext(enemy: EnemyDefinition) {
  return {
    enemyDefinitionId: enemy.id,
    enemyNameKey: enemy.nameKey,
    revealedNameKeys: enemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
  }
}
