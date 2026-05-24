import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  createTutorialRunSummary,
  createInitialTutorialRunState,
  failTutorialRun,
  getRouteBattleEncounterIds,
  getCurrentTutorialEncounter,
  syncTutorialRunEncounters,
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
        incenseMoneyReward: 12,
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
        bossCleared: false,
      }),
    )
    expect(createTutorialRunSummary(failedRun)).toEqual(
      expect.objectContaining({
        status: 'failed',
        failureReason: 'battle_defeat',
        completedEncounterCount: 1,
        totalEncounterCount: 3,
        vanquishCount: 1,
        bossCleared: false,
      }),
    )
  })

  it('can use route battle encounter ids for the T20 route-driven sequence', () => {
    const routeEncounterIds = getRouteBattleEncounterIds(gameData.routes[0])
    const runs = routeEncounterIds
      .slice(0, 8)
      .reduce(
        (states, _encounterId, index) => [
          ...states,
          advanceTutorialRun(
            states[states.length - 1],
            gameData.encounters,
            gameData.tutorialUnlocks,
            index === 7 ? 'catalogue' : 'vanquish',
          ),
        ],
        [createInitialTutorialRunState(gameData.tutorialUnlocks, routeEncounterIds)],
      )

    expect(routeEncounterIds).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_mid_ash_altar_child',
      'encounter_elite_incense_clerk',
      'encounter_multi_offering_table_mouse',
      'encounter_late_plague_paper_figure',
      'encounter_boss_registry_thief',
    ])
    expect(getCurrentTutorialEncounter(runs[3], gameData.encounters)?.id).toBe(
      'encounter_mid_unlit_temple_warden',
    )
    expect(getCurrentTutorialEncounter(runs[4], gameData.encounters)?.id).toBe(
      'encounter_mid_ash_altar_child',
    )
    expect(getCurrentTutorialEncounter(runs[5], gameData.encounters)?.id).toBe(
      'encounter_elite_incense_clerk',
    )
    expect(getCurrentTutorialEncounter(runs[6], gameData.encounters)?.id).toBe(
      'encounter_multi_offering_table_mouse',
    )
    expect(getCurrentTutorialEncounter(runs[7], gameData.encounters)?.id).toBe(
      'encounter_late_plague_paper_figure',
    )
    expect(getCurrentTutorialEncounter(runs[8], gameData.encounters)?.id).toBe(
      'encounter_boss_registry_thief',
    )
    expect(runs[8].status).toBe('active')
    expect(runs[5].unlocks.stages).toContain('stage_three_altars')
    expect(runs[5].completedEncounterIds).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_mid_ash_altar_child',
    ])
  })

  it('syncs stale saved encounter ids with the current route battle order', () => {
    const routeEncounterIds = getRouteBattleEncounterIds(gameData.routes[0])
    const staleEncounterIds = [
      ...routeEncounterIds.slice(0, 3),
      'encounter_multi_thief_mouse_louse',
      ...routeEncounterIds.slice(4),
    ]
    const thirdRun = staleEncounterIds.slice(0, 3).reduce(
      (currentRun) =>
        advanceTutorialRun(
          currentRun,
          gameData.encounters,
          gameData.tutorialUnlocks,
          'vanquish',
        ),
      createInitialTutorialRunState(gameData.tutorialUnlocks, staleEncounterIds),
    )
    const syncedRun = syncTutorialRunEncounters(thirdRun, routeEncounterIds)

    expect(getCurrentTutorialEncounter(thirdRun, gameData.encounters)?.id).toBe(
      'encounter_multi_thief_mouse_louse',
    )
    expect(getCurrentTutorialEncounter(syncedRun, gameData.encounters)?.id).toBe(
      'encounter_mid_unlit_temple_warden',
    )
    expect(syncedRun.currentEncounterIndex).toBe(3)
    expect(syncedRun.settlements).toEqual(thirdRun.settlements)
  })

  it('summarizes boss settlement when the first chapter route is complete', () => {
    const routeEncounterIds = getRouteBattleEncounterIds(gameData.routes[0])
    const completedRun = routeEncounterIds.reduce(
      (currentRun, _encounterId, index) =>
        advanceTutorialRun(
          currentRun,
          gameData.encounters,
          gameData.tutorialUnlocks,
          index === routeEncounterIds.length - 1 ? 'catalogue' : 'vanquish',
        ),
      createInitialTutorialRunState(gameData.tutorialUnlocks, routeEncounterIds),
    )
    const failedBeforeBoss = failTutorialRun(
      advanceTutorialRun(
        createInitialTutorialRunState(gameData.tutorialUnlocks, routeEncounterIds),
        gameData.encounters,
        gameData.tutorialUnlocks,
        'vanquish',
      ),
      'abandoned',
    )

    expect(createTutorialRunSummary(completedRun)).toEqual(
      expect.objectContaining({
        status: 'complete',
        completedEncounterCount: routeEncounterIds.length,
        totalEncounterCount: routeEncounterIds.length,
        bossCleared: true,
        bossEncounterId: 'encounter_boss_registry_thief',
        bossSettlement: 'catalogue',
      }),
    )
    expect(createTutorialRunSummary(failedBeforeBoss)).toEqual(
      expect.objectContaining({
        status: 'failed',
        bossCleared: false,
        bossSettlement: undefined,
      }),
    )
  })
})
