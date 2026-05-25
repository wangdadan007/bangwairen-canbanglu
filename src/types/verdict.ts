import type { CardId, EncounterId, EnemyId, LocalizationKey } from './common'

export type TutorialVerdictChoiceId = 'register' | 'red_ink' | 'erase'
export type TutorialVerdictOptionSourceType = 'artifact' | 'event'
export type TutorialRegisterRuleId =
  | 'register_common_docket'
  | 'register_incense_clerk'
  | 'register_fire_fleeing_name'
  | 'register_dipper_empty_shell'
  | 'register_registry_thief'
export type TutorialEraseVariantId =
  | 'erase'
  | 'erase_gain_ink'
  | 'erase_heavy_split_form'
  | 'erase_next_battle_resources'
export type TutorialVerdictOptionId = 'register' | 'red_ink' | TutorialEraseVariantId

export interface TutorialNextBattleStartBonus {
  readonly ink: number
  readonly incense: number
  readonly openingHandCardDefinitionIds?: readonly CardId[]
}

export interface TutorialVerdictOption {
  readonly id: TutorialVerdictOptionId
  readonly choiceId: TutorialVerdictChoiceId
  readonly eraseVariantId?: TutorialEraseVariantId
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly sourceType?: TutorialVerdictOptionSourceType
  readonly sourceId?: string
  readonly sourceNameKey?: LocalizationKey
}

export interface TutorialVerdictOffer {
  readonly id: string
  readonly encounterId: EncounterId
  readonly enemyDefinitionId: EnemyId
  readonly enemyNameKey: LocalizationKey
  readonly revealedNameKeys: readonly LocalizationKey[]
  readonly options: readonly TutorialVerdictOption[]
}

export interface TutorialVerdictRegisterEntry {
  readonly id: string
  readonly encounterId: EncounterId
  readonly enemyDefinitionId: EnemyId
  readonly enemyNameKey: LocalizationKey
  readonly revealedNameKeys: readonly LocalizationKey[]
  readonly registerRuleId?: TutorialRegisterRuleId
  readonly ruleNameKey?: LocalizationKey
  readonly ruleTextKey?: LocalizationKey
  readonly segmentIndex?: number
  readonly maxTriggerCount?: number
  readonly remainingTriggerCount?: number
}

export interface TutorialVerdictRecord {
  readonly id: string
  readonly encounterId: EncounterId
  readonly enemyDefinitionId: EnemyId
  readonly optionId: TutorialVerdictOptionId
  readonly optionNameKey?: LocalizationKey
  readonly choiceId: TutorialVerdictChoiceId
  readonly eraseVariantId?: TutorialEraseVariantId
  readonly sourceType?: TutorialVerdictOptionSourceType
  readonly sourceId?: string
  readonly sourceNameKey?: LocalizationKey
  readonly registerRuleId?: TutorialRegisterRuleId
  readonly fractureDelta: number
  readonly inkDelta?: number
  readonly doomDelta?: number
  readonly redInkInkCostReductionDelta?: number
  readonly maxIncenseBonusDelta: number
  readonly maxFormBonusDelta: number
  readonly addedCardDefinitionIds?: readonly CardId[]
  readonly addedCardDefinitionId?: CardId
  readonly nextBattleStartBonus?: TutorialNextBattleStartBonus
  readonly registerTriggerLimit?: number
  readonly registerSegmentIndex?: number
}

export interface TutorialVerdictState {
  readonly maxIncenseBonus: number
  readonly registerEntries: readonly TutorialVerdictRegisterEntry[]
  readonly records: readonly TutorialVerdictRecord[]
}
