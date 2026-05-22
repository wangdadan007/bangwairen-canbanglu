import type { RouteTendencyId } from '../../types'

export const REGISTRY_THIEF_BOSS_ENEMY_ID = 'enemy_registry_thief'
export const REGISTRY_THIEF_FRACTURE_INTENT_ID = 'intent_registry_thief_tear_registry'
export const REGISTRY_THIEF_CATALOGUE_INTENT_ID = 'intent_registry_thief_cloak_stolen_name'
export const REGISTRY_THIEF_STEADY_INTENT_ID = 'intent_registry_thief_press_registry'

export function getRegistryThiefInitialIntentIdForRoute(
  routeTendencyIds: readonly RouteTendencyId[] = [],
): string {
  if (
    routeTendencyIds.includes('fracture') ||
    routeTendencyIds.includes('high_pressure')
  ) {
    return REGISTRY_THIEF_FRACTURE_INTENT_ID
  }

  if (routeTendencyIds.includes('catalogue')) {
    return REGISTRY_THIEF_CATALOGUE_INTENT_ID
  }

  return REGISTRY_THIEF_STEADY_INTENT_ID
}

export function createInitialEnemyIntentIdsForRoute(
  enemyDefinitionIds: readonly string[],
  routeTendencyIds: readonly RouteTendencyId[] = [],
): Readonly<Record<string, string>> {
  if (!enemyDefinitionIds.includes(REGISTRY_THIEF_BOSS_ENEMY_ID)) {
    return {}
  }

  return {
    [REGISTRY_THIEF_BOSS_ENEMY_ID]: getRegistryThiefInitialIntentIdForRoute(routeTendencyIds),
  }
}
