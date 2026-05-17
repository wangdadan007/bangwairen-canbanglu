import type {
  RouteDefinition,
  RouteNodeDefinition,
  RouteNodeId,
  RouteNodeStatus,
  RouteState,
} from '../../types'

export function createInitialRouteState(route: RouteDefinition): RouteState {
  assertRouteHasNode(route, route.startNodeId)

  return {
    routeId: route.id,
    currentNodeId: route.startNodeId,
    completedNodeIds: [],
    reachableNodeIds: [route.startNodeId],
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
