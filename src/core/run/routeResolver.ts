import type {
  EncounterDefinition,
  EncounterId,
  EventId,
  RouteDefinition,
  RouteNodeDefinition,
  RouteNodeVariantDefinition,
  RouteNodeId,
  RouteNodeStatus,
  RouteState,
  RouteTendencyId,
} from '../../types'

export type RouteFlowKind =
  | 'battle'
  | 'event'
  | 'rest'
  | 'shop'
  | 'route_selection'
  | 'event_placeholder'
  | 'rest_placeholder'
  | 'shop_placeholder'
  | 'complete'

export function createInitialRouteState(route: RouteDefinition, seed = createRouteSeed()): RouteState {
  assertRouteHasNode(route, route.startNodeId)

  return {
    routeId: route.id,
    routeSeed: seed,
    currentNodeId: route.startNodeId,
    completedNodeIds: [],
    reachableNodeIds: [route.startNodeId],
    routeTendencyIds: [],
    encounterSelections: createEncounterSelections(route, seed),
    eventSelections: createEventSelections(route, seed),
    nodeVariantSelections: createNodeVariantSelections(route, seed),
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
  return getRoutePathNodes(route, state).flatMap((node) =>
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
    return state.reachableNodeIds.length > 0 ? 'route_selection' : 'complete'
  }

  if (state.reachableNodeIds.length > 1 && state.reachableNodeIds.includes(node.id)) {
    return 'route_selection'
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

export function getSelectedRouteNodeVariant(
  node: RouteNodeDefinition,
  state?: RouteState,
): RouteNodeVariantDefinition | undefined {
  const pool = node.nodeVariantPool

  if (!pool?.length) {
    return undefined
  }

  const selectedVariantId = state?.nodeVariantSelections?.[node.id]

  return pool.find((variant) => variant.id === selectedVariantId) ?? pool[0]
}

export function getRouteNodeDisplayTendencyIds(
  node: RouteNodeDefinition,
  state?: RouteState,
): readonly RouteTendencyId[] {
  const variant = getSelectedRouteNodeVariant(node, state)

  return uniqueRouteTendencyIds([
    ...(node.routeTendencyIds ?? []),
    ...(variant?.routeTendencyIds ?? []),
  ])
}

export function getRouteSeedKey(state: RouteState): string {
  return String(state.routeSeed ?? state.routeId)
}

export function completeCurrentRouteNode(route: RouteDefinition, state: RouteState): RouteState {
  assertRouteStateMatchesDefinition(route, state)

  const currentNode = getCurrentRouteNode(route, state)

  if (!currentNode) {
    return state
  }

  for (const nodeId of currentNode.nextNodeIds) {
    assertRouteHasNode(route, nodeId)
  }

  const completedNodeIds = addUnique(state.completedNodeIds, currentNode.id)
  const nextReachableNodeIds = uniqueRouteNodeIds(currentNode.nextNodeIds)
  const currentNodeId = currentNode.nextNodeIds.length === 1 ? currentNode.nextNodeIds[0] : undefined

  return {
    ...state,
    currentNodeId,
    completedNodeIds,
    reachableNodeIds: nextReachableNodeIds,
    routeTendencyIds: appendRouteTendencies(
      state.routeTendencyIds ?? [],
      currentNode.routeTendencyIds ?? [],
    ),
  }
}

export function getReachableRouteNodes(
  route: RouteDefinition,
  state: RouteState,
): readonly RouteNodeDefinition[] {
  assertRouteStateMatchesDefinition(route, state)

  return state.reachableNodeIds.map((nodeId) => {
    const node = getRouteNode(route, nodeId)

    if (!node) {
      throw new Error(`Missing route node ${nodeId} in ${route.id}`)
    }

    return node
  })
}

export function selectReachableRouteNode(
  route: RouteDefinition,
  state: RouteState,
  nodeId: RouteNodeId,
): RouteState {
  assertRouteStateMatchesDefinition(route, state)
  assertRouteHasNode(route, nodeId)

  if (!state.reachableNodeIds.includes(nodeId)) {
    throw new Error(`Route node ${nodeId} is not reachable from current route state`)
  }

  if (state.completedNodeIds.includes(nodeId)) {
    throw new Error(`Route node ${nodeId} has already been completed`)
  }

  return {
    ...state,
    currentNodeId: nodeId,
    reachableNodeIds: [nodeId],
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

function uniqueRouteTendencyIds(tendencyIds: readonly RouteTendencyId[]) {
  return Array.from(new Set(tendencyIds))
}

function appendRouteTendencies(
  currentTendencyIds: readonly RouteTendencyId[],
  nextTendencyIds: readonly RouteTendencyId[],
) {
  return [...currentTendencyIds, ...nextTendencyIds]
}

function getRoutePathNodes(route: RouteDefinition, state?: RouteState) {
  if (state) {
    assertRouteStateMatchesDefinition(route, state)
  }

  const pathNodes: RouteNodeDefinition[] = []
  const visitedNodeIds = new Set<RouteNodeId>()
  let nextNodeId: RouteNodeId | undefined = route.startNodeId

  while (nextNodeId) {
    if (visitedNodeIds.has(nextNodeId)) {
      throw new Error(`Route ${route.id} contains a cycle at ${nextNodeId}`)
    }

    const node = getRouteNode(route, nextNodeId)

    if (!node) {
      throw new Error(`Missing route node ${nextNodeId} in ${route.id}`)
    }

    visitedNodeIds.add(nextNodeId)
    pathNodes.push(node)
    nextNodeId = getNextPathNodeId(node, state)
  }

  return pathNodes
}

function getNextPathNodeId(node: RouteNodeDefinition, state?: RouteState) {
  if (node.nextNodeIds.length <= 1) {
    return node.nextNodeIds[0]
  }

  if (!state) {
    return node.nextNodeIds[0]
  }

  const completedNextNodeId = node.nextNodeIds.find((nodeId) =>
    state.completedNodeIds.includes(nodeId),
  )

  if (completedNextNodeId) {
    return completedNextNodeId
  }

  if (state.currentNodeId && node.nextNodeIds.includes(state.currentNodeId)) {
    return state.currentNodeId
  }

  const reachableNextNodeIds = node.nextNodeIds.filter((nodeId) =>
    state.reachableNodeIds.includes(nodeId),
  )

  return reachableNextNodeIds.length === 1 ? reachableNextNodeIds[0] : node.nextNodeIds[0]
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

function createEventSelections(route: RouteDefinition, seed: number) {
  const selections: Record<RouteNodeId, EventId> = {}
  let eventNodeIndex = 0

  for (const node of route.nodes) {
    const pool = node.eventPoolIds

    if (!pool?.length) {
      continue
    }

    selections[node.id] = pool[getSeededIndex(seed, eventNodeIndex, pool.length)]
    eventNodeIndex += 1
  }

  return selections
}

function createNodeVariantSelections(route: RouteDefinition, seed: number) {
  const selections: Record<RouteNodeId, string> = {}
  let variantNodeIndex = 0

  for (const node of route.nodes) {
    const pool = node.nodeVariantPool

    if (!pool?.length) {
      continue
    }

    selections[node.id] = pool[getSeededVariantIndex(seed, variantNodeIndex, pool.length)].id
    variantNodeIndex += 1
  }

  return selections
}

function getSelectedEncounterId(
  node: RouteNodeDefinition,
  state?: RouteState,
): EncounterId | undefined {
  if (node.encounterPoolIds?.length) {
    return state?.encounterSelections?.[node.id] ?? node.encounterPoolIds[0]
  }

  return node.encounterId
}

function getSeededIndex(seed: number, offset: number, length: number) {
  const mixedSeed = Math.sin(seed + offset * 97.13) * 10000
  return Math.abs(Math.floor(mixedSeed)) % length
}

function getSeededVariantIndex(seed: number, offset: number, length: number) {
  return Math.abs(Math.floor(seed * 17 + offset * 11)) % length
}

function createRouteSeed() {
  return Date.now() + Math.floor(Math.random() * 100000)
}
