import { describe, expect, it } from 'vitest'
import {
  completeCurrentRouteNode,
  createInitialRouteState,
  getCurrentRouteNode,
  getRouteNodeStatus,
} from '../core'
import { gameData } from '../data'

const route = gameData.routes[0]

describe('T16 route skeleton', () => {
  it('starts at the first tutorial battle node', () => {
    const state = createInitialRouteState(route)
    const currentNode = getCurrentRouteNode(route, state)

    expect(state.routeId).toBe('route_chapter_one_skeleton')
    expect(state.currentNodeId).toBe('route_node_tutorial_paper_wraith')
    expect(state.completedNodeIds).toEqual([])
    expect(state.reachableNodeIds).toEqual(['route_node_tutorial_paper_wraith'])
    expect(currentNode?.encounterId).toBe('encounter_tutorial_paper_wraith')
    expect(getRouteNodeStatus(state, 'route_node_tutorial_paper_wraith')).toBe('current')
    expect(getRouteNodeStatus(state, 'route_node_tutorial_incense_thief_mouse')).toBe('locked')
  })

  it('advances through fixed tutorial battle nodes into the route placeholders', () => {
    const first = createInitialRouteState(route)
    const second = completeCurrentRouteNode(route, first)
    const third = completeCurrentRouteNode(route, second)
    const fourth = completeCurrentRouteNode(route, third)

    expect(second.currentNodeId).toBe('route_node_tutorial_incense_thief_mouse')
    expect(second.completedNodeIds).toEqual(['route_node_tutorial_paper_wraith'])
    expect(getRouteNodeStatus(second, 'route_node_tutorial_paper_wraith')).toBe('completed')

    expect(third.currentNodeId).toBe('route_node_tutorial_bronze_bell_patrol')
    expect(third.completedNodeIds).toEqual([
      'route_node_tutorial_paper_wraith',
      'route_node_tutorial_incense_thief_mouse',
    ])

    expect(fourth.currentNodeId).toBe('route_node_first_event')
    expect(getCurrentRouteNode(route, fourth)?.type).toBe('event')
    expect(getCurrentRouteNode(route, fourth)?.isPlaceholder).toBe(true)
  })

  it('supports event, rest, and elite placeholder progression without resolving gameplay', () => {
    const firstBattleDone = completeCurrentRouteNode(route, createInitialRouteState(route))
    const secondBattleDone = completeCurrentRouteNode(route, firstBattleDone)
    const stateAfterTutorialBattles = completeCurrentRouteNode(route, secondBattleDone)
    const restState = completeCurrentRouteNode(route, stateAfterTutorialBattles)
    const eliteState = completeCurrentRouteNode(route, restState)

    expect(getCurrentRouteNode(route, stateAfterTutorialBattles)?.type).toBe('event')
    expect(getCurrentRouteNode(route, restState)?.type).toBe('rest')
    expect(getCurrentRouteNode(route, eliteState)?.type).toBe('elite')
    expect(getCurrentRouteNode(route, eliteState)?.isPlaceholder).toBe(true)
  })
})
