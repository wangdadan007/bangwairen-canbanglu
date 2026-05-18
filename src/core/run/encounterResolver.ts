import type { EncounterDefinition, EnemyId } from '../../types'

export function getEncounterEnemyDefinitionIds(
  encounter: EncounterDefinition,
): readonly EnemyId[] {
  if (encounter.enemySlots?.length) {
    return encounter.enemySlots.map((slot) => slot.enemyDefinitionId)
  }

  return [encounter.enemyDefinitionId]
}
