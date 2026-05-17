import type { LocalizationKey, UnlockStageId } from './common'

export interface TutorialUnlockDefinition {
  readonly id: UnlockStageId
  readonly nameKey: LocalizationKey
  readonly keywords: readonly string[]
}
