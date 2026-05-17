import type { EncounterId, EnemyId, LocalizationKey, UnlockStageId } from './common'

export interface EncounterDefinition {
  readonly id: EncounterId
  readonly nameKey: LocalizationKey
  readonly enemyDefinitionId: EnemyId
  readonly tutorialOrder: number
  readonly lessonKey: LocalizationKey
  readonly completionKey: LocalizationKey
  readonly unlocksOnVictory: readonly UnlockStageId[]
}
