import type { EnemyId, EnemyInstanceId, LocalizationKey } from './common'
import type { CardEffect } from './effect'

export type EnemyTier = 'minion' | 'normal' | 'key_normal' | 'elite' | 'boss'

export type EnemyIntentKind = 'incoming_force' | 'abnormal_move'

export type AbnormalMoveType =
  | 'steal_incense'
  | 'add_fouled_scroll'
  | 'heal_form'
  | 'summon'
  | 'cover_name'
  | 'custom'

export interface AbnormalMoveDefinition {
  readonly type: AbnormalMoveType
  readonly amount?: number
  readonly descriptionKey: LocalizationKey
}

export type EnemyIntentEffect =
  | {
      readonly type: 'INCOMING_FORCE'
      readonly amount: number
    }
  | {
      readonly type: 'ABNORMAL_MOVE'
      readonly move: AbnormalMoveDefinition
    }

export interface EnemyIntentDefinition {
  readonly id: string
  readonly nameKey: LocalizationKey
  readonly kind: EnemyIntentKind
  readonly effects: readonly EnemyIntentEffect[]
}

export interface EnemyNameSlotDefinition {
  readonly index: number
  readonly nameKey: LocalizationKey
}

export interface EnemyMechanicChange {
  readonly id: string
  readonly descriptionKey: LocalizationKey
  readonly removeTraitIds?: readonly string[]
  readonly addTraitIds?: readonly string[]
  readonly effects?: readonly CardEffect[]
}

export interface RewardRule {
  readonly id: string
  readonly quality: 'normal' | 'high'
  readonly descriptionKey: LocalizationKey
}

export interface EnemyDefinition {
  readonly id: EnemyId
  readonly nameKey: LocalizationKey
  readonly maxForm: number
  readonly nameSlots: number
  readonly nameSlotDefinitions?: readonly EnemyNameSlotDefinition[]
  readonly tier: EnemyTier
  readonly intents: readonly EnemyIntentDefinition[]
  readonly traits: readonly string[]
  readonly onNamed?: readonly EnemyMechanicChange[]
  readonly rewards?: readonly RewardRule[]
}

export interface NameSlotState {
  readonly index: number
  readonly nameKey?: LocalizationKey
  readonly isRevealed: boolean
}

export interface EnemyState {
  readonly instanceId: EnemyInstanceId
  readonly definitionId: EnemyId
  readonly maxForm: number
  readonly currentForm: number
  readonly nameSlots: readonly NameSlotState[]
  readonly isNamed: boolean
  readonly hasTriggeredNameBreak: boolean
  readonly intentIndex: number
  readonly currentIntent?: EnemyIntentDefinition
  readonly incomingForce: number
  readonly blockedAbnormalMoveTypes: readonly AbnormalMoveType[]
  readonly traits: readonly string[]
}
