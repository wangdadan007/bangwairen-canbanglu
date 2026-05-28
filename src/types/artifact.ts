import type { ArtifactId, LocalizationKey, UnlockStageId } from './common'

export type ArtifactBindingStatus = 'unbound' | 'bound'

export type ArtifactTriggerType =
  | 'battle_trigger'
  | 'active_charge'
  | 'verdict_modifier'

export type ArtifactProgressKind =
  | 'catalogue_named_enemy'
  | 'ask_name'
  | 'turn_two_break_shape_cards'
  | 'red_ink_applied'
  | 'erase_verdict'

export type ArtifactOverloadKind =
  | 'vanquish_named_enemy_before_named'
  | 'mirror_nameless_twice'
  | 'repeat_red_ink_same_card'
  | 'consecutive_erase_verdicts'

export type ArtifactEffectType =
  | 'next_break_shape_bonus'
  | 'break_chain_incense_bonus'
  | 'peek_intent_after_ask_name'
  | 'seal_momentum_after_ask_name'
  | 'gain_ink_after_ask_name'
  | 'tether_name_after_ask_name'
  | 'red_ink_annotation_bonus'
  | 'erase_reward_bonus'
  | 'erase_heavy_verdict_option'

export type ArtifactBacklashEffectType =
  | 'add_temporary_card'
  | 'hide_intent_before_ask_name'
  | 'lock_red_ink_target'
  | 'temporary_fracture'
  | 'temporary_player_form_loss'

export interface ArtifactProgressCondition {
  readonly kind: ArtifactProgressKind
  readonly requiredCount: number
  readonly descriptionKey: LocalizationKey
}

export interface ArtifactOverloadCondition {
  readonly kind: ArtifactOverloadKind
  readonly descriptionKey: LocalizationKey
}

export interface ArtifactEffect {
  readonly type: ArtifactEffectType
  readonly amount?: number
  readonly descriptionKey: LocalizationKey
}

export interface ArtifactBacklashEffect {
  readonly type: ArtifactBacklashEffectType
  readonly amount?: number
  readonly descriptionKey: LocalizationKey
}

export interface ArtifactDefinition {
  readonly id: ArtifactId
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly triggerType: ArtifactTriggerType
  readonly unlockStage: UnlockStageId
  readonly tags: readonly string[]
  readonly chargesPerBattle?: number
  readonly baseEffect: ArtifactEffect
  readonly boundEffect: ArtifactEffect
  readonly bindCondition: ArtifactProgressCondition
  readonly overloadCondition?: ArtifactOverloadCondition
  readonly backlashEffect?: ArtifactBacklashEffect
}

export interface ArtifactState {
  readonly id: ArtifactId
  readonly definitionId: ArtifactId
  readonly bindingStatus: ArtifactBindingStatus
  readonly bindCondition: ArtifactProgressCondition
  readonly bindProgress: number
  readonly overloadKind?: ArtifactOverloadKind
  readonly chargesRemaining: number
  readonly hasTriggeredThisBattle: boolean
  readonly triggerCountThisBattle: number
  readonly hasOverloadedThisBattle: boolean
  readonly consecutiveOverloadBattles: number
  readonly pendingBacklash: boolean
}

export interface ArtifactCollectionState {
  readonly artifacts: readonly ArtifactState[]
}
