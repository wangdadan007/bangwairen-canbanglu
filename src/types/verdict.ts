import type { CardId, EncounterId, EnemyId, LocalizationKey } from './common'

export type TutorialVerdictChoiceId = 'register' | 'red_ink' | 'erase'

export interface TutorialVerdictOption {
  readonly id: TutorialVerdictChoiceId
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
}

export interface TutorialVerdictRecord {
  readonly id: string
  readonly encounterId: EncounterId
  readonly enemyDefinitionId: EnemyId
  readonly choiceId: TutorialVerdictChoiceId
  readonly fractureDelta: number
  readonly maxIncenseBonusDelta: number
  readonly maxFormBonusDelta: number
  readonly addedCardDefinitionId?: CardId
}

export interface TutorialVerdictState {
  readonly maxIncenseBonus: number
  readonly registerEntries: readonly TutorialVerdictRegisterEntry[]
  readonly records: readonly TutorialVerdictRecord[]
}
