import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createTutorialRunSummary,
  createInitialTutorialRunState,
  failTutorialRun,
  getRouteBattleEncounterIds,
  getCurrentTutorialEncounter,
} from '../core'
import { gameData } from '../data'

describe('T09 tutorial run sequence', () => {
  it('starts at the paper wraith tutorial battle with core unlocks', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const encounter = getCurrentTutorialEncounter(run, gameData.encounters)

    expect(run.status).toBe('active')
    expect(run.currentEncounterIndex).toBe(0)
    expect(encounter?.id).toBe('encounter_tutorial_paper_wraith')
    expect(encounter?.enemyDefinitionId).toBe('enemy_paper_wraith')
    expect(run.unlocks.stages).toContain('stage_core')
    expect(run.unlocks.keywords).toEqual(
      expect.arrayContaining(['break_form', 'ask_name', 'seal_momentum']),
    )
  })

  it('advances through the three fixed tutorial encounters and records settlements', () => {
    const firstRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const secondRun = advanceTutorialRun(
      firstRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
    )
    const thirdRun = advanceTutorialRun(
      secondRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    expect(getCurrentTutorialEncounter(secondRun, gameData.encounters)?.id).toBe(
      'encounter_tutorial_incense_thief_mouse',
    )
    expect(secondRun.completedEncounterIds).toEqual(['encounter_tutorial_paper_wraith'])
    expect(secondRun.settlements).toEqual([
      {
        encounterId: 'encounter_tutorial_paper_wraith',
        settlement: 'catalogue',
      },
    ])
    expect(secondRun.unlocks.stages).toContain('stage_abnormal_boundary')

    expect(getCurrentTutorialEncounter(thirdRun, gameData.encounters)?.id).toBe(
      'encounter_tutorial_bronze_bell_patrol',
    )
    expect(thirdRun.completedEncounterIds).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
    ])
    expect(thirdRun.unlocks.stages).toContain('stage_red_ink_preview')
  })

  it('marks the tutorial run complete after the bronze bell patrol battle', () => {
    const firstRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const secondRun = advanceTutorialRun(
      firstRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const thirdRun = advanceTutorialRun(
      secondRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
    )
    const completedRun = advanceTutorialRun(
      thirdRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
    )

    expect(completedRun.status).toBe('complete')
    expect(getCurrentTutorialEncounter(completedRun, gameData.encounters)).toBeUndefined()
    expect(completedRun.completedEncounterIds).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
    ])
    expect(completedRun.settlements.map((record) => record.settlement)).toEqual([
      'vanquish',
      'catalogue',
      'catalogue',
    ])
  })

  it('can end the tutorial run as failed and hides the current encounter', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const failedRun = failTutorialRun(run, 'abandoned')

    expect(failedRun.status).toBe('failed')
    expect(failedRun.failureReason).toBe('abandoned')
    expect(getCurrentTutorialEncounter(failedRun, gameData.encounters)).toBeUndefined()
    expect(advanceTutorialRun(
      failedRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )).toBe(failedRun)
  })

  it('summarizes the fixed tutorial flow after completion or failure', () => {
    const firstRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const secondRun = advanceTutorialRun(
      firstRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const thirdRun = advanceTutorialRun(
      secondRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
    )
    const completedRun = advanceTutorialRun(
      thirdRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
    )
    const failedRun = failTutorialRun(secondRun, 'battle_defeat')

    expect(createTutorialRunSummary(completedRun)).toEqual(
      expect.objectContaining({
        status: 'complete',
        completedEncounterCount: 3,
        totalEncounterCount: 3,
        vanquishCount: 1,
        catalogueCount: 2,
        deckSize: completedRun.deckCards.length,
      }),
    )
    expect(createTutorialRunSummary(failedRun)).toEqual(
      expect.objectContaining({
        status: 'failed',
        failureReason: 'battle_defeat',
        completedEncounterCount: 1,
        totalEncounterCount: 3,
        vanquishCount: 1,
      }),
    )
  })

  it('can use route battle encounter ids for the T20 route-driven sequence', () => {
    const routeEncounterIds = getRouteBattleEncounterIds(gameData.routes[0])
    const firstRun = createInitialTutorialRunState(gameData.tutorialUnlocks, routeEncounterIds)
    const secondRun = advanceTutorialRun(
      firstRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const thirdRun = advanceTutorialRun(
      secondRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const fourthRun = advanceTutorialRun(
      thirdRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )
    const fifthRun = advanceTutorialRun(
      fourthRun,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
    )

    expect(routeEncounterIds).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_elite_incense_clerk',
    ])
    expect(getCurrentTutorialEncounter(fourthRun, gameData.encounters)?.id).toBe(
      'encounter_mid_unlit_temple_warden',
    )
    expect(getCurrentTutorialEncounter(fifthRun, gameData.encounters)?.id).toBe(
      'encounter_elite_incense_clerk',
    )
    expect(fifthRun.status).toBe('active')
    expect(fifthRun.unlocks.stages).toContain('stage_run_resources')
    expect(fifthRun.completedEncounterIds).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
    ])
  })
})
