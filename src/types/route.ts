import type { EncounterId, EventId, LocalizationKey, RouteId, RouteNodeId } from './common'

export type RouteNodeType = 'normal_battle' | 'elite' | 'event' | 'rest' | 'shop' | 'boss'
export type RouteTendencyId = 'steady' | 'catalogue' | 'fracture' | 'supply' | 'high_pressure'
export type RouteNodeVariantId = string

export interface RouteNodeVariantDefinition {
  readonly id: RouteNodeVariantId
  readonly labelKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly routeTendencyIds?: readonly RouteTendencyId[]
}

export interface RouteNodeDefinition {
  readonly id: RouteNodeId
  readonly type: RouteNodeType
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly encounterId?: EncounterId
  readonly encounterPoolIds?: readonly EncounterId[]
  readonly eventPoolIds?: readonly EventId[]
  readonly nodeVariantPool?: readonly RouteNodeVariantDefinition[]
  readonly nextNodeIds: readonly RouteNodeId[]
  readonly routeTendencyIds?: readonly RouteTendencyId[]
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
  readonly routeSeed?: number
  readonly currentNodeId?: RouteNodeId
  readonly completedNodeIds: readonly RouteNodeId[]
  readonly reachableNodeIds: readonly RouteNodeId[]
  readonly routeTendencyIds?: readonly RouteTendencyId[]
  readonly encounterSelections?: Readonly<Record<RouteNodeId, EncounterId>>
  readonly eventSelections?: Readonly<Record<RouteNodeId, EventId>>
  readonly nodeVariantSelections?: Readonly<Record<RouteNodeId, RouteNodeVariantId>>
}

export type RouteNodeStatus = 'completed' | 'current' | 'reachable' | 'locked'
