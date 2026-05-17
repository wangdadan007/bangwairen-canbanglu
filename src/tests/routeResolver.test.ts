import { describe, expect, it } from 'vitest'
import {
  completeCurrentRouteNode,
  createInitialRouteState,
  getCurrentRouteEncounter,
  getCurrentRouteFlowKind,
  getCurrentRouteNode,
  getRouteNodeStatus,
  getRouteBattleEncounterIds,
} from '../core'
import { gameData } from '../data'

const route = gameData.routes[0]

describe('T20 route skeleton', () => {
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

  it('advances through fixed battle nodes into the route placeholders', () => {
    const first = createInitialRouteState(route)
    const second = completeCurrentRouteNode(route, first)
    const third = completeCurrentRouteNode(route, second)
    const fourth = completeCurrentRouteNode(route, third)
    const eventState = completeCurrentRouteNode(route, fourth)

    expect(second.currentNodeId).toBe('route_node_tutorial_incense_thief_mouse')
    expect(second.completedNodeIds).toEqual(['route_node_tutorial_paper_wraith'])
    expect(getRouteNodeStatus(second, 'route_node_tutorial_paper_wraith')).toBe('completed')

    expect(third.currentNodeId).toBe('route_node_tutorial_bronze_bell_patrol')
    expect(third.completedNodeIds).toEqual([
      'route_node_tutorial_paper_wraith',
      'route_node_tutorial_incense_thief_mouse',
    ])

    expect(fourth.currentNodeId).toBe('route_node_unlit_temple_warden')
    expect(getCurrentRouteNode(route, fourth)?.type).toBe('normal_battle')
    expect(getCurrentRouteNode(route, fourth)?.encounterId).toBe(
      'encounter_mid_unlit_temple_warden',
    )

    expect(eventState.currentNodeId).toBe('route_node_first_event')
    expect(getCurrentRouteNode(route, eventState)?.type).toBe('event')
    expect(getCurrentRouteNode(route, eventState)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, eventState)?.eventPoolIds).toEqual([
      'event_abandoned_registry_desk',
      'event_ash_altar_lamp',
      'event_cinnabar_scribe',
    ])
  })

  it('supports the event node and rest placeholder before entering the first elite encounter', () => {
    const firstBattleDone = completeCurrentRouteNode(route, createInitialRouteState(route))
    const secondBattleDone = completeCurrentRouteNode(route, firstBattleDone)
    const thirdBattleDone = completeCurrentRouteNode(route, secondBattleDone)
    const stateAfterFourthBattle = completeCurrentRouteNode(route, thirdBattleDone)
    const restState = completeCurrentRouteNode(route, stateAfterFourthBattle)
    const eliteState = completeCurrentRouteNode(route, restState)

    expect(getCurrentRouteNode(route, stateAfterFourthBattle)?.type).toBe('event')
    expect(getCurrentRouteNode(route, stateAfterFourthBattle)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, restState)?.type).toBe('rest')
    expect(getCurrentRouteNode(route, restState)?.isPlaceholder).toBe(true)
    expect(getCurrentRouteNode(route, eliteState)?.type).toBe('elite')
    expect(getCurrentRouteNode(route, eliteState)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, eliteState)?.encounterId).toBe('encounter_elite_incense_clerk')
  })

  it('reports the current route flow and current encounter from route state', () => {
    const first = createInitialRouteState(route)
    const second = completeCurrentRouteNode(route, first)
    const third = completeCurrentRouteNode(route, second)
    const fourth = completeCurrentRouteNode(route, third)
    const eventState = completeCurrentRouteNode(route, fourth)
    const restState = completeCurrentRouteNode(route, eventState)
    const eliteState = completeCurrentRouteNode(route, restState)

    expect(getRouteBattleEncounterIds(route)).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_elite_incense_clerk',
    ])
    expect(getCurrentRouteFlowKind(route, first)).toBe('battle')
    expect(getCurrentRouteEncounter(route, fourth, gameData.encounters)?.id).toBe(
      'encounter_mid_unlit_temple_warden',
    )
    expect(getCurrentRouteFlowKind(route, eventState)).toBe('event')
    expect(getCurrentRouteEncounter(route, eventState, gameData.encounters)).toBeUndefined()
    expect(getCurrentRouteFlowKind(route, restState)).toBe('rest_placeholder')
    expect(getCurrentRouteFlowKind(route, eliteState)).toBe('battle')
  })
})
