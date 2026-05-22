import type { CardId, EncounterId, EnemyId, LocalizationKey } from './common'

export type TutorialVerdictChoiceId = 'register' | 'red_ink' | 'erase'
export type TutorialRegisterRuleId =
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
}

export interface TutorialVerdictOption {
  readonly id: TutorialVerdictOptionId
  readonly choiceId: TutorialVerdictChoiceId
  readonly eraseVariantId?: TutorialEraseVariantId
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
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
}

export interface TutorialVerdictRecord {
  readonly id: string
  readonly encounterId: EncounterId
  readonly enemyDefinitionId: EnemyId
  readonly optionId: TutorialVerdictOptionId
  readonly choiceId: TutorialVerdictChoiceId
  readonly eraseVariantId?: TutorialEraseVariantId
  readonly registerRuleId?: TutorialRegisterRuleId
  readonly fractureDelta: number
  readonly inkDelta?: number
  readonly doomDelta?: number
  readonly maxIncenseBonusDelta: number
  readonly maxFormBonusDelta: number
  readonly addedCardDefinitionIds?: readonly CardId[]
  readonly addedCardDefinitionId?: CardId
  readonly nextBattleStartBonus?: TutorialNextBattleStartBonus
}

export interface TutorialVerdictState {
  readonly maxIncenseBonus: number
  readonly registerEntries: readonly TutorialVerdictRegisterEntry[]
  readonly records: readonly TutorialVerdictRecord[]
}
