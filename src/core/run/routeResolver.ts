import type {
  EncounterDefinition,
  EncounterId,
  RouteDefinition,
  RouteNodeDefinition,
  RouteNodeId,
  RouteNodeStatus,
  RouteState,
} from '../../types'

export type RouteFlowKind =
  | 'battle'
  | 'event'
  | 'rest'
  | 'shop'
  | 'event_placeholder'
  | 'rest_placeholder'
  | 'shop_placeholder'
  | 'complete'

export function createInitialRouteState(route: RouteDefinition, seed = createRouteSeed()): RouteState {
  assertRouteHasNode(route, route.startNodeId)

  return {
    routeId: route.id,
    currentNodeId: route.startNodeId,
    completedNodeIds: [],
    reachableNodeIds: [route.startNodeId],
    encounterSelections: createEncounterSelections(route, seed),
  }
}

export function getRouteNode(
  route: RouteDefinition,
  nodeId: RouteNodeId | undefined,
): RouteNodeDefinition | undefined {
  return nodeId ? route.nodes.find((node) => node.id === nodeId) : undefined
}

export function getCurrentRouteNode(
  route: RouteDefinition,
  state: RouteState,
): RouteNodeDefinition | undefined {
  assertRouteStateMatchesDefinition(route, state)
  return getRouteNode(route, state.currentNodeId)
}

export function isRouteBattleNode(node: RouteNodeDefinition | undefined): boolean {
  return Boolean(
    (node?.encounterId || node?.encounterPoolIds?.length) &&
      (node.type === 'normal_battle' || node.type === 'elite' || node.type === 'boss'),
  )
}

export function getRouteBattleEncounterIds(
  route: RouteDefinition,
  state?: RouteState,
): readonly EncounterId[] {
  return route.nodes.flatMap((node) =>
    isRouteBattleNode(node)
      ? [getSelectedEncounterId(node, state)].filter((id): id is EncounterId => Boolean(id))
      : [],
  )
}

export function getCurrentRouteEncounter(
  route: RouteDefinition,
  state: RouteState,
  encounters: readonly EncounterDefinition[],
): EncounterDefinition | undefined {
  const node = getCurrentRouteNode(route, state)

  if (!node || !isRouteBattleNode(node)) {
    return undefined
  }

  const encounterId = getSelectedEncounterId(node, state)

  return encounters.find((encounter) => encounter.id === encounterId)
}

export function getCurrentRouteFlowKind(
  route: RouteDefinition,
  state: RouteState,
): RouteFlowKind {
  const node = getCurrentRouteNode(route, state)

  if (!node) {
    return 'complete'
  }

  if (isRouteBattleNode(node)) {
    return 'battle'
  }

  if (node.type === 'event' && !node.isPlaceholder) {
    return 'event'
  }

  if (node.type === 'rest' && !node.isPlaceholder) {
    return 'rest'
  }

  if (node.type === 'shop' && !node.isPlaceholder) {
    return 'shop'
  }

  if (node.isPlaceholder && node.type === 'event') {
    return 'event_placeholder'
  }

  if (node.isPlaceholder && node.type === 'rest') {
    return 'rest_placeholder'
  }

  if (node.isPlaceholder && node.type === 'shop') {
    return 'shop_placeholder'
  }

  return 'complete'
}

export function getRouteNodeStatus(state: RouteState, nodeId: RouteNodeId): RouteNodeStatus {
  if (state.completedNodeIds.includes(nodeId)) {
    return 'completed'
  }

  if (state.currentNodeId === nodeId) {
    return 'current'
  }

  if (state.reachableNodeIds.includes(nodeId)) {
    return 'reachable'
  }

  return 'locked'
}

export function completeCurrentRouteNode(route: RouteDefinition, state: RouteState): RouteState {
  assertRouteStateMatchesDefinition(route, state)

  const currentNode = getCurrentRouteNode(route, state)

  if (!currentNode) {
    return state
  }

  const completedNodeIds = addUnique(state.completedNodeIds, currentNode.id)
  const nextReachableNodeIds = uniqueRouteNodeIds([
    ...state.reachableNodeIds.filter((nodeId) => nodeId !== currentNode.id),
    ...currentNode.nextNodeIds,
  ])
  const currentNodeId = currentNode.nextNodeIds[0]

  for (const nodeId of currentNode.nextNodeIds) {
    assertRouteHasNode(route, nodeId)
  }

  return {
    ...state,
    currentNodeId,
    completedNodeIds,
    reachableNodeIds: nextReachableNodeIds,
  }
}

function assertRouteStateMatchesDefinition(route: RouteDefinition, state: RouteState) {
  if (route.id !== state.routeId) {
    throw new Error(`Route state ${state.routeId} does not match route definition ${route.id}`)
  }
}

function assertRouteHasNode(route: RouteDefinition, nodeId: RouteNodeId) {
  if (!route.nodes.some((node) => node.id === nodeId)) {
    throw new Error(`Missing route node ${nodeId} in ${route.id}`)
  }
}

function addUnique(nodeIds: readonly RouteNodeId[], nodeId: RouteNodeId) {
  return nodeIds.includes(nodeId) ? nodeIds : [...nodeIds, nodeId]
}

function uniqueRouteNodeIds(nodeIds: readonly RouteNodeId[]) {
  return Array.from(new Set(nodeIds))
}

function createEncounterSelections(route: RouteDefinition, seed: number) {
  const selections: Record<RouteNodeId, EncounterId> = {}
  let battleNodeIndex = 0

  for (const node of route.nodes) {
    if (!isRouteBattleNode(node)) {
      continue
    }

    const pool = node.encounterPoolIds

    if (pool?.length) {
      selections[node.id] = pool[getSeededIndex(seed, battleNodeIndex, pool.length)]
    } else if (node.encounterId) {
      selections[node.id] = node.encounterId
    }

    battleNodeIndex += 1
  }

  return selections
}

function getSelectedEncounterId(
  node: RouteNodeDefinition,
  state?: RouteState,
): EncounterId | undefined {
  return state?.encounterSelections?.[node.id] ?? node.encounterId ?? node.encounterPoolIds?.[0]
}

function getSeededIndex(seed: number, offset: number, length: number) {
  const mixedSeed = Math.sin(seed + offset * 97.13) * 10000
  return Math.abs(Math.floor(mixedSeed)) % length
}

function createRouteSeed() {
  return Date.now() + Math.floor(Math.random() * 100000)
}
