import { describe, expect, it } from 'vitest'
import {
  advanceArtifactProgress,
  advanceArtifactsAfterBattle,
  createInitialArtifactCollection,
  createInitialTutorialRunState,
  resolveTutorialRedInk,
  resolveTutorialVerdict,
  advanceTutorialRun,
} from '../core'
import { gameData } from '../data'
import type { EnemyDefinition } from '../types'

describe('T17 artifact foundation', () => {
  it('creates artifact state as out-of-deck run equipment', () => {
    const run = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      undefined,
      undefined,
      gameData.artifacts,
    )
    const artifactIds = run.artifacts.artifacts.map((artifact) => artifact.definitionId)
    const deckIds = new Set(run.deckDefinitionIds)

    expect(artifactIds).toEqual([
      'artifact_whip_fragment',
      'artifact_bone_mirror',
      'artifact_cinnabar_dou',
      'artifact_fracture_needle',
    ])
    expect(artifactIds.every((artifactId) => !deckIds.has(artifactId))).toBe(true)
    expect(run.artifacts.artifacts.every((artifact) => artifact.bindingStatus === 'unbound')).toBe(
      true,
    )
    expect(
      run.artifacts.artifacts.find(
        (artifact) => artifact.definitionId === 'artifact_cinnabar_dou',
      )?.chargesRemaining,
    ).toBe(1)
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

  it('advances artifact progress from battle, red ink, and erase verdict records', () => {
    const initialRun = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      undefined,
      undefined,
      gameData.artifacts,
    )
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
})

function getArtifactProgress(run: ReturnType<typeof createInitialTutorialRunState>, artifactId: string) {
  const artifact = run.artifacts.artifacts.find((candidate) => candidate.definitionId === artifactId)

  if (!artifact) {
    throw new Error(`Missing artifact state: ${artifactId}`)
  }

  return artifact.bindProgress
}

function createVerdictContext(enemy: EnemyDefinition) {
  return {
    enemyDefinitionId: enemy.id,
    enemyNameKey: enemy.nameKey,
    revealedNameKeys: enemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
  }
}
