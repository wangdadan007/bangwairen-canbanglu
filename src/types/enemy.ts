import type { EnemyId, EnemyInstanceId, LocalizationKey } from './common'
import type { CardEffect } from './effect'

export type EnemyTier = 'minion' | 'normal' | 'key_normal' | 'elite' | 'boss'

export type EnemyIntentKind = 'incoming_force' | 'abnormal_move'

export type EnemyIntentVisibility = 'revealed' | 'masked'

export type EnemyIntentMaskMode = 'none' | 'current_only' | 'always'

export type AbnormalMoveType =
  | 'steal_incense'
  | 'add_fouled_scroll'
  | 'heal_form'
  | 'summon'
  | 'cover_name'
  | 'custom'

export type FouledScrollDestination = 'discard_pile' | 'draw_pile' | 'draw_pile_top'

export type HealFormTarget = 'self' | 'most_wounded_ally'

export interface SummonMoveDefinition {
  readonly enemyDefinitionId: EnemyId
  readonly count?: number
  readonly maxLivingEnemies?: number
}

export interface DoomBargainMoveDefinition {
  readonly doomAmount?: number
  readonly incenseAmount?: number
  readonly nextTurnIncenseBonus?: number
}

export interface AbnormalMoveDefinition {
  readonly type: AbnormalMoveType
  readonly amount?: number
  readonly firstUseAmount?: number
  readonly destination?: FouledScrollDestination
  readonly firstUseDestination?: FouledScrollDestination
  readonly fallbackIncomingForce?: number
  readonly whenNamedIncomingForce?: number
  readonly healTarget?: HealFormTarget
  readonly disruptAltar?: boolean
  readonly summon?: SummonMoveDefinition
  readonly doomBargain?: DoomBargainMoveDefinition
  readonly descriptionKey: LocalizationKey
}

export type IncomingForceBonusCondition =
  | 'summoned_enemy_alive'
  | 'custom_abnormal_executed_this_turn'
  | 'abnormal_move_executed_this_turn'
  | 'fouled_scroll_in_piles'
  | 'covered_name_slot_exists'
  | 'steal_incense_executed'
  | 'altar_active'
  | 'boss_route_catalogue'
  | 'boss_route_fracture'

export interface IncomingForceBonusDefinition {
  readonly amount: number
  readonly condition: IncomingForceBonusCondition
  readonly descriptionKey: LocalizationKey
  readonly enemyDefinitionId?: EnemyId
  readonly moveType?: AbnormalMoveType
  readonly intentId?: string
}

export type IncomingForceAftereffectType =
  | 'expire_latest_altar'
  | 'mask_next_intent'
  | 'add_fouled_scroll'

export interface IncomingForceAftereffectDefinition {
  readonly type: IncomingForceAftereffectType
  readonly condition?: IncomingForceBonusCondition
  readonly descriptionKey: LocalizationKey
  readonly amount?: number
}

export type EnemyIntentEffect =
  | {
      readonly type: 'INCOMING_FORCE'
      readonly amount: number
      readonly descriptionKey?: LocalizationKey
      readonly bonuses?: readonly IncomingForceBonusDefinition[]
      readonly aftereffects?: readonly IncomingForceAftereffectDefinition[]
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
  readonly tier: EnemyTier
  readonly maxForm: number
  readonly currentForm: number
  readonly fireMark?: number
  readonly thunderLead?: number
  readonly nameSlots: readonly NameSlotState[]
  readonly coveredNameSlotIndices: readonly number[]
  readonly isNamed: boolean
  readonly hasTriggeredNameBreak: boolean
  readonly intentIndex: number
  readonly currentIntent?: EnemyIntentDefinition
  readonly currentIntentVisibility: EnemyIntentVisibility
  readonly intentMaskMode: EnemyIntentMaskMode
  readonly nextIntent?: EnemyIntentDefinition
  readonly nextIntentPreview?: EnemyIntentDefinition
  readonly incomingForce: number
  readonly blockedAbnormalMoveTypes: readonly AbnormalMoveType[]
  readonly traits: readonly string[]
}
