import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  completeCurrentRouteNode,
  createInitialRouteState,
  createInitialTutorialRunState,
  createTutorialArtifactOfferIfNeeded,
  createTutorialRunSummary,
  getAvailableEventOptions,
  getAvailableRestOptions,
  getCurrentRouteEncounter,
  getCurrentRouteEvent,
  getCurrentRouteFlowKind,
  getCurrentRouteNode,
  getEncounterEnemyDefinitionIds,
  getRouteBattleEncounterIds,
  resolveTutorialEvent,
  resolveTutorialArtifactOffer,
  resolveTutorialRedInk,
  resolveTutorialRest,
  resolveTutorialReward,
  resolveTutorialVerdict,
} from '../core'
import { getEnemyDefinition, gameData } from '../data'
import type {
  RouteDefinition,
  EncounterDefinition,
  TutorialRunState,
  VictorySettlement,
} from '../types'

describe('T42 chapter-one long-flow smoke and coverage', () => {
  it('records content coverage for the current first chapter pool', () => {
    const rewardCards = gameData.cards.filter((card) => card.tags.includes('reward'))
    const multiEnemyEncounters = gameData.encounters.filter(
      (encounter) => (encounter.enemySlots?.length ?? 1) > 1,
    )

    expect(gameData.cards).toHaveLength(44)
    expect(rewardCards).toHaveLength(35)
    expect(gameData.artifacts).toHaveLength(10)
    expect(gameData.events).toHaveLength(9)
    expect(gameData.enemies.filter((enemy) => enemy.tier === 'elite')).toHaveLength(3)
    expect(gameData.enemies.filter((enemy) => enemy.tier === 'boss')).toHaveLength(1)
    expect(multiEnemyEncounters.map((encounter) => encounter.id)).toEqual([
      'encounter_multi_paper_wraith_imp',
      'encounter_multi_thief_mouse_louse',
      'encounter_multi_offering_table_mouse',
    ])
    expect(
      ['break_form', 'ask_name', 'seal_momentum', 'artifact', 'altar'].every((tag) =>
        rewardCards.some((card) => card.tags.includes(tag)),
      ),
    ).toBe(true)
  })

  it('can complete a pure-logic vanquish route without pending choices', () => {
    const result = completeRouteSmoke({
      route: gameData.routes[0],
      seed: 11,
      chooseSettlement: () => 'vanquish',
    })

    expect(result.run.status).toBe('complete')
    expect(getCurrentRouteFlowKind(gameData.routes[0], result.route)).toBe('complete')
    expect(result.run.pendingReward).toBeUndefined()
    expect(result.run.pendingVerdict).toBeUndefined()
    expect(result.run.pendingRedInk).toBeUndefined()
    expect(result.run.pendingArtifactOffer).toBeUndefined()
    expect(result.run.artifacts.artifacts).toHaveLength(3)
    expect(createTutorialRunSummary(result.run)).toEqual(
      expect.objectContaining({
        completedEncounterCount: getRouteBattleEncounterIds(gameData.routes[0], result.initialRoute).length,
        vanquishCount: result.run.settlements.length,
        catalogueCount: 0,
        bossCleared: true,
        bossSettlement: 'vanquish',
      }),
    )
  })

  it('can complete a pure-logic catalogue-leaning route with verdict and reward cleanup', () => {
    const result = completeRouteSmoke({
      route: gameData.routes[0],
      seed: 19,
      chooseSettlement: (_encounterId, index) => (index % 3 === 0 ? 'catalogue' : 'vanquish'),
    })
    const summary = createTutorialRunSummary(result.run)

    expect(result.run.status).toBe('complete')
    expect(summary.catalogueCount).toBeGreaterThan(0)
    expect(summary.verdictRegisterCount).toBe(summary.catalogueCount)
    expect(summary.rewardSkippedCount).toBe(result.run.settlements.length)
    expect(result.run.pendingReward).toBeUndefined()
    expect(result.run.pendingVerdict).toBeUndefined()
    expect(result.run.pendingRedInk).toBeUndefined()
    expect(result.run.pendingArtifactOffer).toBeUndefined()
    expect(result.run.artifacts.artifacts).toHaveLength(3)
    expect(result.run.deckCards.length).toBeGreaterThan(0)
  })
})

function completeRouteSmoke({
  route,
  seed,
  chooseSettlement,
}: {
  readonly route: RouteDefinition
  readonly seed: number
  readonly chooseSettlement: (encounterId: string, battleIndex: number) => VictorySettlement
}) {
  let routeState = createInitialRouteState(route, seed)
  const initialRoute = routeState
  let run = createInitialTutorialRunState(
    gameData.tutorialUnlocks,
    getRouteBattleEncounterIds(route, routeState),
    undefined,
    gameData.artifacts,
  )
  run = resolvePendingRunChoices(run)
  let battleIndex = 0

  while (getCurrentRouteFlowKind(route, routeState) !== 'complete') {
    const flowKind = getCurrentRouteFlowKind(route, routeState)
    const node = getCurrentRouteNode(route, routeState)

    if (flowKind === 'battle') {
      const encounter = getCurrentRouteEncounter(route, routeState, gameData.encounters)

      if (!encounter) {
        throw new Error('Missing route encounter during smoke')
      }

      const settlement = chooseSettlement(encounter.id, battleIndex)
      const primaryEnemy = getPrimaryEnemyForEncounter(encounter)
      run = advanceTutorialRun(
        run,
        gameData.encounters,
        gameData.tutorialUnlocks,
        settlement,
        gameData.cards,
        settlement === 'catalogue'
          ? {
              enemyDefinitionId: primaryEnemy.id,
              enemyNameKey: primaryEnemy.nameKey,
              revealedNameKeys: primaryEnemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
            }
          : undefined,
        undefined,
        run.resources,
      )
      run = resolvePendingRunChoices(run)
      routeState = completeCurrentRouteNode(route, routeState)
      battleIndex += 1
      continue
    }

    if (flowKind === 'event') {
      const event = getCurrentRouteEvent(node, gameData.events, run)

      if (event) {
        const option = getAvailableEventOptions(event, run)[0]

        if (!option) {
          throw new Error(`No event option available: ${event.id}`)
        }

        run = resolveTutorialEvent(run, event, option.id)
        run = resolvePendingRunChoices(run)
      }

      routeState = completeCurrentRouteNode(route, routeState)
      continue
    }

    if (flowKind === 'rest') {
      const option = getAvailableRestOptions(run).find((candidate) => candidate.id === 'red_ink_service')
      const fallbackOption = option ?? getAvailableRestOptions(run)[0]

      if (!fallbackOption) {
        throw new Error('No rest option available')
      }

      run = resolveTutorialRest(run, {
        optionId: fallbackOption.id,
        deckCardId: fallbackOption.id === 'remove_card' ? run.deckCards[0]?.id : undefined,
        routeNodeId: node?.id,
      })
      run = resolvePendingRunChoices(run)
      routeState = completeCurrentRouteNode(route, routeState)
      continue
    }

    routeState = completeCurrentRouteNode(route, routeState)
  }

  return {
    initialRoute,
    route: routeState,
    run,
  }
}

function resolvePendingRunChoices(run: TutorialRunState): TutorialRunState {
  let nextRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts)

  for (let index = 0; index < 10; index += 1) {
    if (nextRun.pendingVerdict) {
      nextRun = resolveTutorialVerdict(nextRun, 'register')
      continue
    }

    if (nextRun.pendingRedInk) {
      nextRun = resolveTutorialRedInk(nextRun)
      continue
    }

    if (nextRun.pendingReward) {
      nextRun = resolveTutorialReward(nextRun)
      continue
    }

    if (nextRun.pendingArtifactOffer) {
      const artifactDefinitionId = nextRun.pendingArtifactOffer.options[0]?.artifactDefinitionId

      if (!artifactDefinitionId) {
        throw new Error(`No artifact option available: ${nextRun.pendingArtifactOffer.id}`)
      }

      nextRun = resolveTutorialArtifactOffer(nextRun, artifactDefinitionId, gameData.artifacts)
      continue
    }

    const offeredRun = createTutorialArtifactOfferIfNeeded(nextRun, gameData.artifacts)

    if (!offeredRun.pendingArtifactOffer) {
      return offeredRun
    }

    nextRun = offeredRun
  }

  throw new Error('Too many pending run choices during long-flow smoke')
}

function getPrimaryEnemyForEncounter(encounter: EncounterDefinition) {
  const primaryEnemyId = getEncounterEnemyDefinitionIds(encounter)[0]
  const enemy = getEnemyDefinition(primaryEnemyId, gameData)

  if (!enemy) {
    throw new Error(`Missing primary enemy for encounter: ${primaryEnemyId}`)
  }

  return enemy
}
