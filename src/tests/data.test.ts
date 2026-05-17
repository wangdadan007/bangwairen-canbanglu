import { describe, expect, it } from 'vitest'
import { getArtifactDefinition, getCardDefinition, getEnemyDefinition, loadGameData } from '../data'

describe('initial game data', () => {
  it('loads starter cards, tutorial enemy, unlocks, and localization', () => {
    const data = loadGameData()

    expect(data.artifacts).toHaveLength(4)
    expect(data.cards).toHaveLength(18)
    expect(data.enemies).toHaveLength(8)
    expect(data.encounters).toHaveLength(6)
    expect(data.routes).toHaveLength(1)
    expect(data.tutorialUnlocks).toHaveLength(3)
    expect(data.localization['card.zhu_fu.name']).toBe('朱符')
  })

  it('keeps ids unique', () => {
    const data = loadGameData()

    expect(new Set(data.artifacts.map((artifact) => artifact.id)).size).toBe(data.artifacts.length)
    expect(new Set(data.cards.map((card) => card.id)).size).toBe(data.cards.length)
    expect(new Set(data.enemies.map((enemy) => enemy.id)).size).toBe(data.enemies.length)
    expect(new Set(data.encounters.map((encounter) => encounter.id)).size).toBe(
      data.encounters.length,
    )
    expect(new Set(data.routes.map((route) => route.id)).size).toBe(data.routes.length)
    for (const route of data.routes) {
      expect(new Set(route.nodes.map((node) => node.id)).size).toBe(route.nodes.length)
    }
    expect(new Set(data.tutorialUnlocks.map((unlock) => unlock.id)).size).toBe(
      data.tutorialUnlocks.length,
    )
  })

  it('contains the T17 starter artifact definitions outside the card pool', () => {
    const data = loadGameData()
    const artifactIds = data.artifacts.map((artifact) => artifact.id)
    const cardIds = new Set(data.cards.map((card) => card.id))

    expect(artifactIds).toEqual([
      'artifact_whip_fragment',
      'artifact_bone_mirror',
      'artifact_cinnabar_dou',
      'artifact_fracture_needle',
    ])
    expect(artifactIds.every((artifactId) => !cardIds.has(artifactId))).toBe(true)
    expect(getArtifactDefinition('artifact_whip_fragment', data)?.triggerType).toBe(
      'battle_trigger',
    )
    expect(getArtifactDefinition('artifact_cinnabar_dou', data)?.chargesPerBattle).toBe(1)
    expect(getArtifactDefinition('artifact_fracture_needle', data)?.triggerType).toBe(
      'verdict_modifier',
    )
    expect(data.artifacts.map((artifact) => artifact.bindCondition.kind)).toEqual([
      'catalogue_named_enemy',
      'ask_name',
      'red_ink_applied',
      'erase_verdict',
    ])
  })

  it('contains starter cards, paper wraith, and abnormal move tutorial data', () => {
    const data = loadGameData()

    expect(getCardDefinition('card_zhu_fu', data)?.cost).toBe(1)
    expect(getCardDefinition('card_ask_name', data)?.effects[0].type).toBe('ASK_NAME')
    expect(getCardDefinition('card_guard_desk_talisman', data)?.effects[0].type).toBe(
      'SEAL_MOMENTUM',
    )
    expect(getCardDefinition('card_cut_supply_talisman', data)?.effects[0].type).toBe(
      'COUNTER_ABNORMAL_MOVE',
    )
    expect(getCardDefinition('card_mark_forehead', data)?.effects.map((effect) => effect.type)).toEqual([
      'BREAK_SHAPE',
      'ASK_NAME',
    ])
    expect(getCardDefinition('card_order_scroll', data)?.effects[0].type).toBe('DRAW')
    expect(getCardDefinition('card_quiet_incense', data)?.effects[0].type).toBe('GAIN_INCENSE')
    expect(getCardDefinition('card_split_form_talisman', data)?.tags).toContain('reward')
    expect(getCardDefinition('card_trace_name_slip', data)?.tags).toContain('catalogue_reward')
    expect(getCardDefinition('card_thunder_splinter', data)?.effects[0]).toEqual({
      type: 'BREAK_SHAPE',
      target: 'selected_enemy',
      amount: 8,
    })
    expect(getCardDefinition('card_name_hook_charm', data)?.effects.map((effect) => effect.type)).toEqual([
      'ASK_NAME',
      'BREAK_SHAPE',
      'DRAW',
    ])
    expect(getCardDefinition('card_heavy_edict', data)?.effects[1]).toEqual({
      type: 'DRAW',
      target: 'self',
      count: 1,
      condition: {
        type: 'THIS_TURN_NAMED_ENEMY',
      },
    })
    expect(getCardDefinition('card_mirror_slip', data)?.tags).toContain('catalogue_reward')
    expect(getCardDefinition('card_press_door_charm', data)?.unlockStage).toBe(
      'stage_abnormal_boundary',
    )
    expect(getCardDefinition('card_counterforce_talisman', data)?.effects.map((effect) => effect.type)).toEqual([
      'SEAL_MOMENTUM',
      'BREAK_SHAPE',
    ])
    expect(getCardDefinition('card_joint_seal_tablet', data)?.effects[0]).toEqual({
      type: 'SEAL_MOMENTUM',
      target: 'all_enemies',
      amount: 3,
    })
    expect(getCardDefinition('card_watch_incense_line', data)?.tags).toContain('abnormal_move')
    expect(getCardDefinition('card_red_ink_trial', data)?.unlockStage).toBe(
      'stage_red_ink_preview',
    )

    const paperWraith = getEnemyDefinition('enemy_paper_wraith', data)
    expect(paperWraith?.maxForm).toBe(18)
    expect(paperWraith?.nameSlots).toBe(2)
    expect(paperWraith?.intents[0].kind).toBe('incoming_force')

    const incenseThiefMouse = getEnemyDefinition('enemy_incense_thief_mouse', data)
    expect(incenseThiefMouse?.intents[0].kind).toBe('abnormal_move')
    expect(incenseThiefMouse?.intents[0].effects[0].type).toBe('ABNORMAL_MOVE')

    const bronzeBellPatrol = getEnemyDefinition('enemy_bronze_bell_patrol', data)
    expect(bronzeBellPatrol?.intents.every((intent) => intent.kind === 'incoming_force')).toBe(true)

    const namelessPaperImp = getEnemyDefinition('enemy_nameless_paper_imp', data)
    expect(namelessPaperImp?.tier).toBe('minion')
    expect(namelessPaperImp?.nameSlots).toBe(0)
    expect(namelessPaperImp?.intents[0].effects[0]).toEqual({
      type: 'INCOMING_FORCE',
      amount: 3,
    })

    const incenseAshLouse = getEnemyDefinition('enemy_incense_ash_louse', data)
    expect(incenseAshLouse?.tier).toBe('minion')
    expect(incenseAshLouse?.nameSlots).toBe(0)
    expect(incenseAshLouse?.intents.map((intent) => intent.kind)).toEqual([
      'incoming_force',
      'abnormal_move',
    ])

    const unlitTempleWarden = getEnemyDefinition('enemy_unlit_temple_warden', data)
    expect(unlitTempleWarden?.tier).toBe('normal')
    expect(unlitTempleWarden?.maxForm).toBe(24)
    expect(unlitTempleWarden?.nameSlots).toBe(2)
    expect(unlitTempleWarden?.intents.every((intent) => intent.kind === 'incoming_force')).toBe(
      true,
    )

    const incenseClerk = getEnemyDefinition('enemy_incense_clerk', data)
    expect(incenseClerk?.tier).toBe('elite')
    expect(incenseClerk?.maxForm).toBe(38)
    expect(incenseClerk?.nameSlots).toBe(3)
    expect(incenseClerk?.intents.map((intent) => intent.kind)).toEqual([
      'incoming_force',
      'abnormal_move',
      'incoming_force',
    ])

    const registryThief = getEnemyDefinition('enemy_registry_thief', data)
    expect(registryThief?.tier).toBe('boss')
    expect(registryThief?.maxForm).toBe(72)
    expect(registryThief?.nameSlots).toBe(3)
    expect(registryThief?.intents.map((intent) => intent.kind)).toEqual([
      'incoming_force',
      'abnormal_move',
    ])

    expect(data.encounters.map((encounter) => encounter.enemyDefinitionId)).toEqual([
      'enemy_paper_wraith',
      'enemy_incense_thief_mouse',
      'enemy_bronze_bell_patrol',
      'enemy_unlit_temple_warden',
      'enemy_incense_clerk',
      'enemy_registry_thief',
    ])
  })

  it('keeps encounter enemy and route encounter references valid', () => {
    const data = loadGameData()
    const enemyIds = new Set(data.enemies.map((enemy) => enemy.id))
    const encounterIds = new Set(data.encounters.map((encounter) => encounter.id))

    expect(data.encounters.every((encounter) => enemyIds.has(encounter.enemyDefinitionId))).toBe(
      true,
    )
    expect(
      data.routes.every((route) =>
        route.nodes.every((node) => !node.encounterId || encounterIds.has(node.encounterId)),
      ),
    ).toBe(true)
  })

  it('contains the route skeleton with T19 fourth battle and elite encounter wiring', () => {
    const data = loadGameData()
    const route = data.routes[0]

    expect(route.id).toBe('route_chapter_one_skeleton')
    expect(route.startNodeId).toBe('route_node_tutorial_paper_wraith')
    expect(route.nodes.map((node) => node.type)).toEqual([
      'normal_battle',
      'normal_battle',
      'normal_battle',
      'normal_battle',
      'event',
      'rest',
      'elite',
    ])
    expect(route.nodes.filter((node) => node.isPlaceholder).map((node) => node.type)).toEqual([
      'event',
      'rest',
    ])
    expect(route.nodes.flatMap((node) => node.encounterId ?? [])).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_elite_incense_clerk',
    ])
  })

  it('expands the early card pool across break form, ask name, and seal momentum', () => {
    const data = loadGameData()
    const cardsByDirection = {
      breakForm: data.cards.filter((card) => card.tags.includes('break_form')),
      askName: data.cards.filter((card) => card.tags.includes('ask_name')),
      sealMomentum: data.cards.filter((card) => card.tags.includes('seal_momentum')),
    }

    expect(cardsByDirection.breakForm).toHaveLength(7)
    expect(cardsByDirection.askName).toHaveLength(5)
    expect(cardsByDirection.sealMomentum).toHaveLength(4)
    expect(data.cards.filter((card) => card.tags.includes('reward'))).toHaveLength(11)
  })

  it('keeps early chapter reward numbers within the current enemy curve', () => {
    const data = loadGameData()
    const rewardCards = data.cards.filter((card) => card.tags.includes('reward'))
    const directBreakAmounts = rewardCards.flatMap((card) =>
      card.effects
        .filter((effect) => effect.type === 'BREAK_SHAPE')
        .map((effect) => effect.amount),
    )
    const sealMomentumAmounts = rewardCards.flatMap((card) =>
      card.effects
        .filter((effect) => effect.type === 'SEAL_MOMENTUM')
        .map((effect) => effect.amount),
    )

    expect(Math.max(...directBreakAmounts)).toBeLessThanOrEqual(8)
    expect(Math.max(...sealMomentumAmounts)).toBeLessThanOrEqual(5)
  })

  it('keeps logical object keys ASCII-only while allowing localized values', () => {
    const data = loadGameData()

    expect(hasNonAsciiKey(data.cards)).toBe(false)
    expect(hasNonAsciiKey(data.artifacts)).toBe(false)
    expect(hasNonAsciiKey(data.enemies)).toBe(false)
    expect(hasNonAsciiKey(data.encounters)).toBe(false)
    expect(hasNonAsciiKey(data.routes)).toBe(false)
    expect(hasNonAsciiKey(data.tutorialUnlocks)).toBe(false)
  })

  it('keeps every artifact display key covered by localization', () => {
    const data = loadGameData()
    const artifactLocalizationKeys = data.artifacts.flatMap((artifact) => [
      artifact.nameKey,
      artifact.descriptionKey,
      artifact.rulesTextKey,
      artifact.baseEffect.descriptionKey,
      artifact.boundEffect.descriptionKey,
      artifact.bindCondition.descriptionKey,
      ...(artifact.overloadCondition ? [artifact.overloadCondition.descriptionKey] : []),
      ...(artifact.backlashEffect ? [artifact.backlashEffect.descriptionKey] : []),
    ])

    expect(artifactLocalizationKeys.every((key) => data.localization[key])).toBe(true)
  })

  it('keeps every card display key covered by localization', () => {
    const data = loadGameData()
    const cardLocalizationKeys = data.cards.flatMap((card) => [
      card.nameKey,
      card.descriptionKey,
      card.rulesTextKey,
    ])

    expect(cardLocalizationKeys.every((key) => data.localization[key])).toBe(true)
  })

  it('keeps every enemy display key covered by localization', () => {
    const data = loadGameData()
    const enemyLocalizationKeys = data.enemies.flatMap((enemy) => [
      enemy.nameKey,
      ...(enemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? []),
      ...enemy.intents.flatMap((intent) => [
        intent.nameKey,
        ...intent.effects.flatMap((effect) =>
          effect.type === 'ABNORMAL_MOVE' ? [effect.move.descriptionKey] : [],
        ),
      ]),
      ...(enemy.rewards?.map((reward) => reward.descriptionKey) ?? []),
    ])

    expect(enemyLocalizationKeys.every((key) => data.localization[key])).toBe(true)
  })

  it('keeps every encounter display key covered by localization', () => {
    const data = loadGameData()
    const encounterLocalizationKeys = data.encounters.flatMap((encounter) => [
      encounter.nameKey,
      encounter.lessonKey,
      encounter.completionKey,
    ])

    expect(encounterLocalizationKeys.every((key) => data.localization[key])).toBe(true)
  })

  it('keeps every route display key covered by localization', () => {
    const data = loadGameData()
    const routeLocalizationKeys = data.routes.flatMap((route) => [
      route.nameKey,
      route.descriptionKey,
      ...route.nodes.flatMap((node) => [node.nameKey, node.descriptionKey]),
    ])

    expect(routeLocalizationKeys.every((key) => data.localization[key])).toBe(true)
  })
})

function hasNonAsciiKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasNonAsciiKey(item))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, nestedValue]) => /[^\u0000-\u007f]/.test(key) || hasNonAsciiKey(nestedValue),
    )
  }

  return false
}
