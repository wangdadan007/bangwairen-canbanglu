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

describe('T28 chapter one route closure', () => {
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

  it('advances through fixed battle nodes into the event, shop, and rest nodes', () => {
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
      'event_mid_ink_pool',
      'event_abandoned_registry_desk',
      'event_ash_altar_lamp',
      'event_cinnabar_scribe',
    ])
  })

  it('supports event, shop, rest, elite, and boss nodes before route completion', () => {
    const states = collectRouteStates()
    const stateAfterFourthBattle = states[4]
    const shopState = states[5]
    const restState = states[6]
    const eliteState = states[7]
    const lateBattleState = states[8]
    const secondEliteState = states[9]
    const thirdEliteState = states[11]
    const bossState = states[13]
    const completeState = states[14]

    expect(getCurrentRouteNode(route, stateAfterFourthBattle)?.type).toBe('event')
    expect(getCurrentRouteNode(route, stateAfterFourthBattle)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, shopState)?.type).toBe('shop')
    expect(getCurrentRouteNode(route, shopState)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, restState)?.type).toBe('rest')
    expect(getCurrentRouteNode(route, restState)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, eliteState)?.type).toBe('elite')
    expect(getCurrentRouteNode(route, eliteState)?.isPlaceholder).toBeUndefined()
    expect(getCurrentRouteNode(route, eliteState)?.encounterId).toBe('encounter_elite_incense_clerk')
    expect(getCurrentRouteNode(route, lateBattleState)?.type).toBe('normal_battle')
    expect(getCurrentRouteNode(route, lateBattleState)?.encounterId).toBe(
      'encounter_late_plague_paper_figure',
    )
    expect(getCurrentRouteNode(route, secondEliteState)?.encounterId).toBe(
      'encounter_elite_fire_fleeing_name',
    )
    expect(getCurrentRouteNode(route, thirdEliteState)?.encounterId).toBe(
      'encounter_elite_dipper_empty_shell',
    )
    expect(getCurrentRouteNode(route, bossState)?.type).toBe('boss')
    expect(getCurrentRouteNode(route, bossState)?.encounterId).toBe(
      'encounter_boss_registry_thief',
    )
    expect(getCurrentRouteFlowKind(route, completeState)).toBe('complete')
  })

  it('reports the current route flow and current encounter from route state', () => {
    const states = collectRouteStates()
    const first = states[0]
    const fourth = states[3]
    const eventState = states[4]
    const shopState = states[5]
    const restState = states[6]
    const eliteState = states[7]
    const bossState = states[13]

    expect(getRouteBattleEncounterIds(route)).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_elite_incense_clerk',
      'encounter_late_plague_paper_figure',
      'encounter_elite_fire_fleeing_name',
      'encounter_late_scroll_stuffer_clerk',
      'encounter_elite_dipper_empty_shell',
      'encounter_late_fleeing_name_paper_horse',
      'encounter_boss_registry_thief',
    ])
    expect(getCurrentRouteFlowKind(route, first)).toBe('battle')
    expect(getCurrentRouteEncounter(route, fourth, gameData.encounters)?.id).toBe(
      'encounter_mid_unlit_temple_warden',
    )
    expect(getCurrentRouteFlowKind(route, eventState)).toBe('event')
    expect(getCurrentRouteEncounter(route, eventState, gameData.encounters)).toBeUndefined()
    expect(getCurrentRouteFlowKind(route, shopState)).toBe('shop')
    expect(getCurrentRouteFlowKind(route, restState)).toBe('rest')
    expect(getCurrentRouteFlowKind(route, eliteState)).toBe('battle')
    expect(getCurrentRouteFlowKind(route, bossState)).toBe('battle')
    expect(getCurrentRouteEncounter(route, bossState, gameData.encounters)?.id).toBe(
      'encounter_boss_registry_thief',
    )
  })
})

function collectRouteStates() {
  const states = [createInitialRouteState(route)]

  while (getCurrentRouteFlowKind(route, states[states.length - 1]) !== 'complete') {
    states.push(completeCurrentRouteNode(route, states[states.length - 1]))
  }

  return states
}
