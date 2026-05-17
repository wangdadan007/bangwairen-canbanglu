import { describe, expect, it } from 'vitest'
import { createInitialBattleState } from '../core'
import { getEncounterDefinition, getEnemyDefinition, gameData } from '../data'

describe('T18 elite and boss encounter skeletons', () => {
  it('wires the first elite route node to an executable incense clerk encounter', () => {
    const route = gameData.routes[0]
    const eliteNode = route.nodes.find((node) => node.id === 'route_node_first_elite')
    const encounter = getEncounterDefinition(eliteNode?.encounterId ?? '', gameData)
    const enemy = encounter ? getEnemyDefinition(encounter.enemyDefinitionId, gameData) : undefined

    expect(eliteNode?.type).toBe('elite')
    expect(eliteNode?.isPlaceholder).toBeUndefined()
    expect(encounter?.id).toBe('encounter_elite_incense_clerk')
    expect(enemy?.id).toBe('enemy_incense_clerk')
    expect(enemy?.tier).toBe('elite')

    const battle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: enemy!,
    })

    expect(battle.enemies[0].definitionId).toBe('enemy_incense_clerk')
    expect(battle.enemies[0].maxForm).toBe(38)
    expect(battle.enemies[0].nameSlots).toHaveLength(3)
    expect(battle.enemies[0].currentIntent?.kind).toBe('incoming_force')
    expect(battle.enemies[0].incomingForce).toBe(7)
  })

  it('keeps the registry thief boss as a data-only encounter until the route closes later', () => {
    const bossEncounter = getEncounterDefinition('encounter_boss_registry_thief', gameData)
    const boss = bossEncounter
      ? getEnemyDefinition(bossEncounter.enemyDefinitionId, gameData)
      : undefined
    const routeEncounterIds = gameData.routes[0].nodes.flatMap((node) => node.encounterId ?? [])

    expect(bossEncounter?.enemyDefinitionId).toBe('enemy_registry_thief')
    expect(boss?.tier).toBe('boss')
    expect(boss?.intents).toHaveLength(2)
    expect(routeEncounterIds).not.toContain('encounter_boss_registry_thief')

    const battle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: boss!,
    })

    expect(battle.enemies[0].definitionId).toBe('enemy_registry_thief')
    expect(battle.enemies[0].maxForm).toBe(72)
    expect(battle.enemies[0].nameSlots).toHaveLength(3)
    expect(battle.enemies[0].currentIntent?.id).toBe('intent_registry_thief_press_registry')
  })
})
