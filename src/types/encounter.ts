import type { EncounterId, EnemyId, LocalizationKey, UnlockStageId } from './common'

export type EncounterEnemyRole = 'primary' | 'support'

export interface EncounterEnemySlotDefinition {
  readonly id: string
  readonly enemyDefinitionId: EnemyId
  readonly role?: EncounterEnemyRole
}

export interface EncounterDefinition {
  readonly id: EncounterId
  readonly nameKey: LocalizationKey
  readonly enemyDefinitionId: EnemyId
  readonly enemySlots?: readonly EncounterEnemySlotDefinition[]
  readonly tutorialOrder: number
  readonly lessonKey: LocalizationKey
  readonly completionKey: LocalizationKey
  readonly unlocksOnVictory: readonly UnlockStageId[]
}
