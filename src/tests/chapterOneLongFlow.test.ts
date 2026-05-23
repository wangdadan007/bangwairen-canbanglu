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
  getReachableRouteNodes,
  getRouteBattleEncounterIds,
  HENGJIAN_ROLE_ID,
  LIANJIN_ROLE_ID,
  RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
  resolveTutorialEvent,
  resolveTutorialArtifactOffer,
  resolveTutorialRedInk,
  resolveTutorialRest,
  resolveTutorialReward,
  resolveTutorialVerdict,
  selectReachableRouteNode,
  syncTutorialRunEncounters,
  ZHAOWEI_ROLE_ID,
} from '../core'
import { getEnemyDefinition, gameData } from '../data'
import type {
  EncounterDefinition,
  PlayableRoleId,
  RouteDefinition,
  RouteNodeDefinition,
  RouteNodeId,
  RouteState,
  TutorialRunState,
  VictorySettlement,
} from '../types'

describe('T42 chapter-one long-flow smoke and coverage', () => {
  it('records content coverage for the current first chapter pool', () => {
    const rewardCards = gameData.cards.filter((card) => card.tags.includes('reward'))
    const multiEnemyEncounters = gameData.encounters.filter(
      (encounter) => (encounter.enemySlots?.length ?? 1) > 1,
    )

    expect(gameData.cards).toHaveLength(46)
    expect(rewardCards).toHaveLength(36)
    expect(gameData.artifacts).toHaveLength(11)
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

  it('can complete all three T64 main routes with each T62 playable role', () => {
    const roleCases: readonly {
      readonly roleId: PlayableRoleId
      readonly seed: number
      readonly starterArtifactId: string
      readonly expectedBaseForm: number
    }[] = [
      {
        roleId: HENGJIAN_ROLE_ID,
        seed: 31,
        starterArtifactId: 'artifact_whip_fragment',
        expectedBaseForm: 72,
      },
      {
        roleId: ZHAOWEI_ROLE_ID,
        seed: 37,
        starterArtifactId: 'artifact_bone_mirror',
        expectedBaseForm: 64,
      },
      {
        roleId: LIANJIN_ROLE_ID,
        seed: 43,
        starterArtifactId: RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
        expectedBaseForm: 78,
      },
    ]
    const routeCases: readonly {
      readonly label: string
      readonly routeNodeIds: readonly RouteNodeId[]
      readonly expectedTendencyId: string
    }[] = [
      {
        label: 'steady-shop',
        routeNodeIds: ['route_node_unlit_temple_warden', 'route_node_first_shop'],
        expectedTendencyId: 'steady',
      },
      {
        label: 'catalogue-pressure',
        routeNodeIds: ['route_node_first_elite', 'route_node_second_elite'],
        expectedTendencyId: 'catalogue',
      },
      {
        label: 'fracture-event',
        routeNodeIds: ['route_node_fracture_fortune_breaker', 'route_node_first_event'],
        expectedTendencyId: 'fracture',
      },
    ]

    for (const roleCase of roleCases) {
      for (const routeCase of routeCases) {
        const result = completeRouteSmoke({
          route: gameData.routes[0],
          seed: roleCase.seed,
          roleId: roleCase.roleId,
          chooseRouteNode: createRouteSequenceChooser(routeCase.routeNodeIds),
          chooseSettlement: (_encounterId, index) => (index % 3 === 0 ? 'catalogue' : 'vanquish'),
        })
        const summary = createTutorialRunSummary(result.run)
        const artifactIds = result.run.artifacts.artifacts.map((artifact) => artifact.definitionId)

        expect(result.run.status, `${roleCase.roleId} ${routeCase.label}`).toBe('complete')
        expect(result.run.roleId).toBe(roleCase.roleId)
        expect(result.run.pendingReward).toBeUndefined()
        expect(result.run.pendingVerdict).toBeUndefined()
        expect(result.run.pendingRedInk).toBeUndefined()
        expect(result.run.pendingArtifactOffer).toBeUndefined()
        expect(result.run.playerForm.max).toBeGreaterThanOrEqual(roleCase.expectedBaseForm)
        expect(artifactIds[0]).toBe(roleCase.starterArtifactId)
        expect(artifactIds).toHaveLength(3)
        expect(result.route.routeTendencyIds).toContain(routeCase.expectedTendencyId)
        expect(result.route.routeTendencyIds).toContain('supply')
        expect(result.run.artifactOfferRecords.map((record) => record.stage)).toEqual([
          'mid_chapter',
          'boss_clear',
        ])
        expect(summary.completedEncounterCount).toBe(result.run.encounterIds.length)
        expect(summary.catalogueCount).toBeGreaterThan(0)
        expect(summary.bossCleared).toBe(true)
      }
    }
  })

  it('covers the alternate mid-branch for every T64 main route with non-exclusive roles', () => {
    const branchCases: readonly {
      readonly roleId: PlayableRoleId
      readonly routeNodeIds: readonly RouteNodeId[]
      readonly expectedTendencyIds: readonly string[]
    }[] = [
      {
        roleId: LIANJIN_ROLE_ID,
        routeNodeIds: ['route_node_unlit_temple_warden', 'route_node_rest_site'],
        expectedTendencyIds: ['steady', 'supply'],
      },
      {
        roleId: HENGJIAN_ROLE_ID,
        routeNodeIds: ['route_node_first_elite', 'route_node_mid_event'],
        expectedTendencyIds: ['catalogue', 'supply'],
      },
      {
        roleId: ZHAOWEI_ROLE_ID,
        routeNodeIds: [
          'route_node_fracture_fortune_breaker',
          'route_node_late_scroll_stuffer_clerk',
        ],
        expectedTendencyIds: ['fracture', 'high_pressure', 'supply'],
      },
    ]

    for (const branchCase of branchCases) {
      const result = completeRouteSmoke({
        route: gameData.routes[0],
        seed: 61,
        roleId: branchCase.roleId,
        chooseRouteNode: createRouteSequenceChooser(branchCase.routeNodeIds),
        chooseSettlement: (_encounterId, index) => (index % 2 === 0 ? 'catalogue' : 'vanquish'),
      })

      expect(result.run.status).toBe('complete')
      expect(result.run.roleId).toBe(branchCase.roleId)
      expect(result.run.playerForm.current).toBeGreaterThanOrEqual(
        Math.floor(result.run.playerForm.max * 0.35),
      )
      for (const tendencyId of branchCase.expectedTendencyIds) {
        expect(result.route.routeTendencyIds).toContain(tendencyId)
      }
    }
  })
})

function completeRouteSmoke({
  route,
  seed,
  roleId,
  chooseRouteNode,
  chooseSettlement,
}: {
  readonly route: RouteDefinition
  readonly seed: number
  readonly roleId?: PlayableRoleId
  readonly chooseRouteNode?: (nodes: readonly RouteNodeDefinition[], context: RouteChoiceContext) => RouteNodeId
  readonly chooseSettlement: (encounterId: string, battleIndex: number) => VictorySettlement
}) {
  let routeState = createInitialRouteState(route, seed)
  const initialRoute = routeState
  let run = createInitialTutorialRunState(
    gameData.tutorialUnlocks,
    getRouteBattleEncounterIds(route, routeState),
    undefined,
    gameData.artifacts,
    roleId,
  )
  run = resolvePendingRunChoices(run, routeState)
  let battleIndex = 0
  let routeChoiceIndex = 0

  while (getCurrentRouteFlowKind(route, routeState) !== 'complete') {
    const flowKind = getCurrentRouteFlowKind(route, routeState)
    const node = getCurrentRouteNode(route, routeState)

    if (flowKind === 'route_selection') {
      const reachableNodes = getReachableRouteNodes(route, routeState)
      const selectedNodeId =
        chooseRouteNode?.(reachableNodes, {
          routeState,
          run,
          routeChoiceIndex,
        }) ?? reachableNodes[0]?.id

      if (!selectedNodeId) {
        throw new Error('No route node available during route selection')
      }

      routeState = selectReachableRouteNode(route, routeState, selectedNodeId)
      run = syncTutorialRunEncounters(run, getRouteBattleEncounterIds(route, routeState))
      routeChoiceIndex += 1
      continue
    }

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
      routeState = completeCurrentRouteNode(route, routeState)
      run = resolvePendingRunChoices(run, routeState)
      battleIndex += 1
      continue
    }

    if (flowKind === 'event') {
      const event = getCurrentRouteEvent(node, gameData.events, run, routeState)

      if (event) {
        const option = getAvailableEventOptions(event, run)[0]

        if (!option) {
          throw new Error(`No event option available: ${event.id}`)
        }

        run = resolveTutorialEvent(run, event, option.id)
      }

      routeState = completeCurrentRouteNode(route, routeState)
      run = resolvePendingRunChoices(run, routeState)
      continue
    }

    if (flowKind === 'rest') {
      const restOptions = getAvailableRestOptions(run)
      const option =
        run.resources.ink >= 1
          ? restOptions.find((candidate) => candidate.id === 'red_ink_service')
          : undefined
      const fallbackOption =
        option ?? restOptions.find((candidate) => candidate.id !== 'red_ink_service')

      if (!fallbackOption) {
        throw new Error('No rest option available')
      }

      run = resolveTutorialRest(run, {
        optionId: fallbackOption.id,
        deckCardId: fallbackOption.id === 'remove_card' ? run.deckCards[0]?.id : undefined,
        routeNodeId: node?.id,
      })
      routeState = completeCurrentRouteNode(route, routeState)
      run = resolvePendingRunChoices(run, routeState)
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

interface RouteChoiceContext {
  readonly routeState: RouteState
  readonly run: TutorialRunState
  readonly routeChoiceIndex: number
}

function createRouteSequenceChooser(routeNodeIds: readonly RouteNodeId[]) {
  let nextSelectionIndex = 0

  return (nodes: readonly RouteNodeDefinition[]) => {
    const expectedNodeId = routeNodeIds[nextSelectionIndex]
    const selectedNode =
      nodes.find((node) => node.id === expectedNodeId) ??
      nodes.find((node) => routeNodeIds.includes(node.id)) ??
      nodes[0]

    if (selectedNode?.id === expectedNodeId) {
      nextSelectionIndex += 1
    }

    if (!selectedNode) {
      throw new Error('No route node available in sequence chooser')
    }

    return selectedNode.id
  }
}

function resolvePendingRunChoices(
  run: TutorialRunState,
  routeState?: RouteState,
): TutorialRunState {
  let nextRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts, {
    routeTendencyIds: routeState?.routeTendencyIds ?? [],
  })

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

    const offeredRun = createTutorialArtifactOfferIfNeeded(nextRun, gameData.artifacts, {
      routeTendencyIds: routeState?.routeTendencyIds ?? [],
    })

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
