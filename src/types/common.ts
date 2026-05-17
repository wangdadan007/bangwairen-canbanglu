export type CardId = string
export type CardInstanceId = string
export type EnemyId = string
export type EnemyInstanceId = string
export type ArtifactId = string
export type EncounterId = string
export type RouteId = string
export type RouteNodeId = string
export type LocalizationKey = string
export type UnlockStageId = string

export type JsonPrimitive = string | number | boolean | null
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

export type GameEntityId =
  | CardId
  | CardInstanceId
  | EnemyId
  | EnemyInstanceId
  | ArtifactId
  | EncounterId
  | RouteId
  | RouteNodeId
  | 'player'
  | 'system'
