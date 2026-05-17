import type { EncounterId, EventId, LocalizationKey, RouteId, RouteNodeId } from './common'

export type RouteNodeType = 'normal_battle' | 'elite' | 'event' | 'rest' | 'shop' | 'boss'

export interface RouteNodeDefinition {
  readonly id: RouteNodeId
  readonly type: RouteNodeType
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly encounterId?: EncounterId
  readonly eventPoolIds?: readonly EventId[]
  readonly nextNodeIds: readonly RouteNodeId[]
  readonly isPlaceholder?: boolean
}

export interface RouteDefinition {
  readonly id: RouteId
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly startNodeId: RouteNodeId
  readonly nodes: readonly RouteNodeDefinition[]
}

export interface RouteState {
  readonly routeId: RouteId
  readonly currentNodeId?: RouteNodeId
  readonly completedNodeIds: readonly RouteNodeId[]
  readonly reachableNodeIds: readonly RouteNodeId[]
}

export type RouteNodeStatus = 'completed' | 'current' | 'reachable' | 'locked'
