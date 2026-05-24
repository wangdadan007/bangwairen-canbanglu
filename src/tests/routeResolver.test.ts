import { describe, expect, it } from 'vitest'
import {
  completeCurrentRouteNode,
  createInitialRouteState,
  getCurrentRouteEncounter,
  getCurrentRouteFlowKind,
  getCurrentRouteNode,
  getReachableRouteNodes,
  getRouteBattleEncounterIds,
  getRouteNodeStatus,
  isRouteBattleNode,
  selectReachableRouteNode,
} from '../core'
import { gameData } from '../data'
import type { RouteState } from '../types'

const route = gameData.routes[0]
const routeSeed = 7

describe('T64 chapter one branched route closure', () => {
  it('starts at the first tutorial battle node', () => {
    const state = createInitialRouteState(route, routeSeed)
    const currentNode = getCurrentRouteNode(route, state)

    expect(state.routeId).toBe('route_chapter_one_skeleton')
    expect(state.currentNodeId).toBe('route_node_tutorial_paper_wraith')
    expect(state.completedNodeIds).toEqual([])
    expect(state.reachableNodeIds).toEqual(['route_node_tutorial_paper_wraith'])
    expect(state.routeTendencyIds).toEqual([])
    expect(currentNode?.encounterId).toBe('encounter_tutorial_paper_wraith')
    expect(getRouteNodeStatus(state, 'route_node_tutorial_paper_wraith')).toBe('current')
    expect(getRouteNodeStatus(state, 'route_node_tutorial_incense_thief_mouse')).toBe('locked')
  })

  it('keeps the first three battles fixed before opening three main route choices', () => {
    const first = createInitialRouteState(route, routeSeed)
    const second = completeCurrentRouteNode(route, first)
    const third = completeCurrentRouteNode(route, second)
    const firstChoice = completeCurrentRouteNode(route, third)

    expect(second.currentNodeId).toBe('route_node_tutorial_incense_thief_mouse')
    expect(third.currentNodeId).toBe('route_node_tutorial_bronze_bell_patrol')
    expect(firstChoice.currentNodeId).toBeUndefined()
    expect(firstChoice.completedNodeIds).toEqual([
      'route_node_tutorial_paper_wraith',
      'route_node_tutorial_incense_thief_mouse',
      'route_node_tutorial_bronze_bell_patrol',
    ])
    expect(getCurrentRouteFlowKind(route, firstChoice)).toBe('route_selection')
    expect(getReachableRouteNodes(route, firstChoice).map((node) => node.id)).toEqual([
      'route_node_unlit_temple_warden',
      'route_node_first_elite',
      'route_node_fracture_fortune_breaker',
    ])
  })

  it('supports steady, catalogue, and fracture main routes with one mid-branch each', () => {
    const firstChoice = advanceToFirstChoice()

    const steady = selectReachableRouteNode(route, firstChoice, 'route_node_unlit_temple_warden')
    const steadyBranch = completeCurrentRouteNode(route, steady)
    expect(getCurrentRouteEncounter(route, steady, gameData.encounters)?.id).toBe(
      'encounter_mid_unlit_temple_warden',
    )
    expect(getCurrentRouteFlowKind(route, steadyBranch)).toBe('route_selection')
    expect(getReachableRouteNodes(route, steadyBranch).map((node) => node.id)).toEqual([
      'route_node_first_shop',
      'route_node_rest_site',
    ])
    expect(completeCurrentRouteNode(
      route,
      selectReachableRouteNode(route, steadyBranch, 'route_node_first_shop'),
    ).currentNodeId).toBe('route_node_steady_mid_altar_check')

    const catalogue = selectReachableRouteNode(route, firstChoice, 'route_node_first_elite')
    const catalogueBranch = completeCurrentRouteNode(route, catalogue)
    expect(getCurrentRouteEncounter(route, catalogue, gameData.encounters)?.id).toBe(
      'encounter_elite_incense_clerk',
    )
    expect(getReachableRouteNodes(route, catalogueBranch).map((node) => node.id)).toEqual([
      'route_node_second_elite',
      'route_node_mid_event',
    ])
    expect(completeCurrentRouteNode(
      route,
      selectReachableRouteNode(route, catalogueBranch, 'route_node_second_elite'),
    ).currentNodeId).toBe('route_node_catalogue_rest')

    const fracture = selectReachableRouteNode(route, firstChoice, 'route_node_fracture_fortune_breaker')
    const fractureBranch = completeCurrentRouteNode(route, fracture)
    expect(getCurrentRouteEncounter(route, fracture, gameData.encounters)?.id).toBe(
      'encounter_mid_fortune_breaker',
    )
    expect(getReachableRouteNodes(route, fractureBranch).map((node) => node.id)).toEqual([
      'route_node_first_event',
      'route_node_late_scroll_stuffer_clerk',
    ])
    expect(completeCurrentRouteNode(
      route,
      selectReachableRouteNode(route, fractureBranch, 'route_node_late_scroll_stuffer_clerk'),
    ).currentNodeId).toBe('route_node_fracture_shop')
  })

  it('reports route tendencies from completed nodes for later boss and QA tuning', () => {
    const firstChoice = advanceToFirstChoice()
    const catalogue = selectReachableRouteNode(route, firstChoice, 'route_node_first_elite')
    const catalogueBranch = completeCurrentRouteNode(route, catalogue)
    const secondElite = selectReachableRouteNode(route, catalogueBranch, 'route_node_second_elite')
    const afterSecondElite = completeCurrentRouteNode(route, secondElite)

    expect(catalogueBranch.routeTendencyIds).toEqual(['catalogue', 'high_pressure'])
    expect(afterSecondElite.routeTendencyIds).toEqual([
      'catalogue',
      'high_pressure',
      'catalogue',
      'high_pressure',
    ])
  })

  it('builds battle encounter order from the selected route path instead of every node', () => {
    const defaultRouteState = createInitialRouteState(route, 11)
    const firstChoice = advanceToFirstChoice(defaultRouteState)
    const catalogue = selectReachableRouteNode(route, firstChoice, 'route_node_first_elite')
    const catalogueBranch = completeCurrentRouteNode(route, catalogue)
    const cataloguePressure = selectReachableRouteNode(
      route,
      catalogueBranch,
      'route_node_second_elite',
    )

    expect(getRouteBattleEncounterIds(route)).toEqual([
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
    expect(getRouteBattleEncounterIds(route, defaultRouteState)).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      defaultRouteState.encounterSelections?.route_node_steady_mid_altar_check,
      'encounter_elite_incense_clerk',
      defaultRouteState.encounterSelections?.route_node_steady_support_pressure,
      defaultRouteState.encounterSelections?.route_node_late_plague_paper_figure,
      'encounter_boss_registry_thief',
    ])
    expect(getRouteBattleEncounterIds(route, cataloguePressure)).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_elite_incense_clerk',
      'encounter_elite_fire_fleeing_name',
      cataloguePressure.encounterSelections?.route_node_catalogue_name_pressure,
      cataloguePressure.encounterSelections?.route_node_catalogue_altar_crosscheck,
      cataloguePressure.encounterSelections?.route_node_catalogue_final_pollution,
      'encounter_boss_registry_thief',
    ])
  })

  it('keeps every concrete branch at eight or nine battles before the boss', () => {
    const paths = collectRoutePaths(route.startNodeId)

    expect(paths).toHaveLength(6)

    for (const path of paths) {
      const bossIndex = path.indexOf('route_node_boss_registry_thief')
      const bossPreBattleCount = path
        .slice(0, bossIndex)
        .filter((nodeId) => isRouteBattleNode(route.nodes.find((node) => node.id === nodeId)))
        .length

      expect(bossIndex).toBeGreaterThan(0)
      expect(bossPreBattleCount).toBeGreaterThanOrEqual(8)
      expect(bossPreBattleCount).toBeLessThanOrEqual(9)
    }
  })

  it('rejects route choices that are not currently reachable', () => {
    const firstChoice = advanceToFirstChoice()

    expect(() =>
      selectReachableRouteNode(route, firstChoice, 'route_node_boss_registry_thief'),
    ).toThrow(/not reachable/)
  })
})

function advanceToFirstChoice(initialState: RouteState = createInitialRouteState(route, routeSeed)) {
  return completeCurrentRouteNode(
    route,
    completeCurrentRouteNode(route, completeCurrentRouteNode(route, initialState)),
  )
}

function collectRoutePaths(nodeId: string, currentPath: readonly string[] = []): string[][] {
  if (currentPath.includes(nodeId)) {
    throw new Error(`Route cycle in test path at ${nodeId}`)
  }

  const node = route.nodes.find((routeNode) => routeNode.id === nodeId)

  if (!node) {
    throw new Error(`Missing route node in test path: ${nodeId}`)
  }

  const nextPath = [...currentPath, node.id]

  if (node.nextNodeIds.length === 0) {
    return [nextPath]
  }

  return node.nextNodeIds.flatMap((nextNodeId) => collectRoutePaths(nextNodeId, nextPath))
}
