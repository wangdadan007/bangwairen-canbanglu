import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  getRegistryThiefInitialIntentIdForRoute,
  REGISTRY_THIEF_BOSS_ENEMY_ID,
} from '../core'
import { getEncounterDefinition, getEnemyDefinition, gameData } from '../data'

describe('T31-T35 elite and boss encounter skeletons', () => {
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

  it('wires the second and third elite route nodes to executable encounters', () => {
    const route = gameData.routes[0]
    const secondEliteNode = route.nodes.find((node) => node.id === 'route_node_second_elite')
    const thirdEliteNode = route.nodes.find((node) => node.id === 'route_node_third_elite')
    const secondEncounter = getEncounterDefinition(secondEliteNode?.encounterId ?? '', gameData)
    const thirdEncounter = getEncounterDefinition(thirdEliteNode?.encounterId ?? '', gameData)
    const fireElite = secondEncounter
      ? getEnemyDefinition(secondEncounter.enemyDefinitionId, gameData)
      : undefined
    const dipperElite = thirdEncounter
      ? getEnemyDefinition(thirdEncounter.enemyDefinitionId, gameData)
      : undefined

    expect(secondEliteNode?.type).toBe('elite')
    expect(secondEncounter?.id).toBe('encounter_elite_fire_fleeing_name')
    expect(fireElite?.tier).toBe('elite')
    expect(fireElite?.intents.map((intent) => intent.kind)).toEqual([
      'incoming_force',
      'abnormal_move',
      'incoming_force',
    ])

    expect(thirdEliteNode?.type).toBe('elite')
    expect(thirdEncounter?.id).toBe('encounter_elite_dipper_empty_shell')
    expect(dipperElite?.tier).toBe('elite')
    expect(dipperElite?.traits).toEqual(
      expect.arrayContaining(['altar', 'artifact', 'cover_name']),
    )

    const battle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: fireElite!,
    })

    expect(battle.enemies[0].definitionId).toBe('enemy_fire_fleeing_name')
    expect(battle.enemies[0].maxForm).toBe(48)
    expect(battle.enemies[0].nameSlots).toHaveLength(3)
  })

  it('wires the registry thief boss into the first chapter route closure', () => {
    const bossEncounter = getEncounterDefinition('encounter_boss_registry_thief', gameData)
    const boss = bossEncounter
      ? getEnemyDefinition(bossEncounter.enemyDefinitionId, gameData)
      : undefined
    const routeEncounterIds = gameData.routes[0].nodes.flatMap((node) => node.encounterId ?? [])

    expect(bossEncounter?.enemyDefinitionId).toBe('enemy_registry_thief')
    expect(boss?.tier).toBe('boss')
    expect(boss?.maxForm).toBe(84)
    expect(boss?.intents).toHaveLength(5)
    expect(boss?.intents.map((intent) => intent.id)).toEqual([
      'intent_registry_thief_press_registry',
      'intent_registry_thief_pinch_offering',
      'intent_registry_thief_cloak_stolen_name',
      'intent_registry_thief_tear_registry',
      'intent_registry_thief_final_stamp',
    ])
    expect(routeEncounterIds[routeEncounterIds.length - 1]).toBe('encounter_boss_registry_thief')

    const battle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: boss!,
    })

    expect(battle.enemies[0].definitionId).toBe('enemy_registry_thief')
    expect(battle.enemies[0].maxForm).toBe(84)
    expect(battle.enemies[0].nameSlots).toHaveLength(3)
    expect(battle.enemies[0].currentIntent?.id).toBe('intent_registry_thief_press_registry')
  })

  it('lets T65 route tendency adjust the registry thief opening pressure', () => {
    const boss = getEnemyDefinition('enemy_registry_thief', gameData)

    if (!boss) {
      throw new Error('Missing registry thief boss definition')
    }

    const catalogueIntentId = getRegistryThiefInitialIntentIdForRoute(['catalogue', 'supply'])
    const fractureIntentId = getRegistryThiefInitialIntentIdForRoute([
      'fracture',
      'high_pressure',
    ])
    const catalogueBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: boss,
      initialEnemyIntentIds: {
        [REGISTRY_THIEF_BOSS_ENEMY_ID]: catalogueIntentId,
      },
    })
    const fractureBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: boss,
      initialEnemyIntentIds: {
        [REGISTRY_THIEF_BOSS_ENEMY_ID]: fractureIntentId,
      },
    })

    expect(catalogueIntentId).toBe('intent_registry_thief_cloak_stolen_name')
    expect(fractureIntentId).toBe('intent_registry_thief_tear_registry')
    expect(catalogueBattle.enemies[0].intentIndex).toBe(2)
    expect(catalogueBattle.enemies[0].currentIntent?.id).toBe(catalogueIntentId)
    expect(fractureBattle.enemies[0].intentIndex).toBe(3)
    expect(fractureBattle.enemies[0].currentIntent?.id).toBe(fractureIntentId)
  })
})
