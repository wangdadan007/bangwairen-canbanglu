import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  applyTutorialResourceDelta,
  canSpendTutorialResources,
  createInitialTutorialResourceState,
  createInitialTutorialRunState,
  createTutorialRunSummary,
  resolveTutorialVerdict,
} from '../core'
import { gameData } from '../data'
import type { EnemyDefinition } from '../types'

describe('T23 run resources', () => {
  it('creates and clamps the ink, doom, and fracture resource state', () => {
    const resources = createInitialTutorialResourceState()
    const gained = applyTutorialResourceDelta(resources, {
      ink: 2,
      doom: 1,
      fracture: 1,
    })
    const spent = applyTutorialResourceDelta(gained, {
      ink: -3,
      doom: -1,
      fracture: -1,
    })

    expect(resources).toEqual({
      ink: 0,
      doom: 0,
      fracture: 0,
    })
    expect(gained).toEqual({
      ink: 2,
      doom: 1,
      fracture: 1,
    })
    expect(spent).toEqual({
      ink: 0,
      doom: 0,
      fracture: 0,
    })
    expect(canSpendTutorialResources(gained, { ink: -1 })).toBe(true)
    expect(canSpendTutorialResources(resources, { ink: -1 })).toBe(false)
  })

  it('stores battle resource changes back into the run when a battle advances', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const nextRun = advanceTutorialRun(
      run,
      gameData.encounters,
      gameData.tutorialUnlocks,
      'vanquish',
      undefined,
      undefined,
      undefined,
      {
        ink: 1,
        doom: 1,
        fracture: 0,
      },
    )

    expect(nextRun.resources).toEqual({
      ink: 1,
      doom: 1,
      fracture: 0,
    })
  })

  it('summarizes ink, doom, and fracture from run resources', () => {
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const resourceRun = {
      ...run,
      resources: {
        ink: 2,
        doom: 1,
        fracture: 1,
      },
    }
    const summary = createTutorialRunSummary(resourceRun)

    expect(summary).toEqual(
      expect.objectContaining({
        ink: 2,
        doom: 1,
        fracture: 1,
      }),
    )
  })

  it('adds fracture through erase verdict as a run resource', () => {
    const run = advanceTutorialRun(
      createInitialTutorialRunState(gameData.tutorialUnlocks),
      gameData.encounters,
      gameData.tutorialUnlocks,
      'catalogue',
      gameData.cards,
      createVerdictContext(gameData.enemies[0]),
    )
    const nextRun = resolveTutorialVerdict(run, 'erase')

    expect(nextRun.resources.fracture).toBe(1)
    expect(nextRun.verdict.records[0].fractureDelta).toBe(1)
  })
})

function createVerdictContext(enemy: EnemyDefinition) {
  return {
    enemyDefinitionId: enemy.id,
    enemyNameKey: enemy.nameKey,
    revealedNameKeys: enemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
  }
}
