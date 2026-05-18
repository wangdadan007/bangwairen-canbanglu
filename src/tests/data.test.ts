import { describe, expect, it } from 'vitest'
import { getArtifactDefinition, getCardDefinition, getEnemyDefinition, loadGameData } from '../data'

describe('initial game data', () => {
  it('loads starter cards, tutorial enemy, unlocks, and localization', () => {
    const data = loadGameData()

    expect(data.artifacts).toHaveLength(8)
    expect(data.cards).toHaveLength(44)
    expect(data.enemies).toHaveLength(16)
    expect(data.encounters).toHaveLength(25)
    expect(data.events).toHaveLength(9)
    expect(data.routes).toHaveLength(1)
    expect(data.shopItems).toHaveLength(5)
    expect(data.tutorialUnlocks).toHaveLength(6)
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
    expect(new Set(data.events.map((event) => event.id)).size).toBe(data.events.length)
    expect(new Set(data.routes.map((route) => route.id)).size).toBe(data.routes.length)
    expect(new Set(data.shopItems.map((item) => item.id)).size).toBe(data.shopItems.length)
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
      'artifact_registry_inkstone',
      'artifact_seal_door_tablet',
      'artifact_ash_lamp',
      'artifact_doom_bell',
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
      'ask_name',
      'catalogue_named_enemy',
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
    expect(getCardDefinition('card_ink_rubbing_slip', data)?.effects.map((effect) => effect.type)).toEqual([
      'ASK_NAME',
      'GAIN_INK',
    ])
    expect(getCardDefinition('card_borrowed_doom_talisman', data)?.effects.map((effect) => effect.type)).toEqual([
      'GAIN_DOOM',
      'GAIN_INCENSE',
    ])
    expect(getCardDefinition('card_human_altar_name_sigil', data)?.effects[0].type).toBe(
      'PLACE_ALTAR',
    )
    expect(getCardDefinition('card_earth_altar_watch', data)?.effects[0]).toEqual({
      type: 'PLACE_ALTAR',
      target: 'selected_enemy',
      altarSlot: 'earth',
      altarEffect: {
        type: 'counter_abnormal_or_gain_ink',
        amount: 1,
        moveType: 'steal_incense',
      },
    })
    expect(getCardDefinition('card_heaven_altar_oracle', data)?.tags).toContain(
      'catalogue_reward',
    )
    expect(getCardDefinition('card_doom_flash_talisman', data)?.effects.map((effect) => effect.type)).toEqual([
      'GAIN_DOOM',
      'BREAK_SHAPE',
    ])
    expect(getCardDefinition('card_cracked_whip_echo', data)?.type).toBe('temporary')
    expect(getCardDefinition('card_fouled_scroll', data)?.effects).toEqual([])

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

    const fortuneBreaker = getEnemyDefinition('enemy_fortune_breaker', data)
    expect(fortuneBreaker?.tier).toBe('normal')
    expect(fortuneBreaker?.maxForm).toBe(26)
    expect(fortuneBreaker?.traits).toContain('doom')

    const ashAltarChild = getEnemyDefinition('enemy_ash_altar_child', data)
    expect(ashAltarChild?.tier).toBe('normal')
    expect(ashAltarChild?.intents.map((intent) => intent.kind)).toEqual([
      'abnormal_move',
      'incoming_force',
    ])

    const plaguePaperFigure = getEnemyDefinition('enemy_plague_paper_figure', data)
    expect(plaguePaperFigure?.tier).toBe('normal')
    expect(plaguePaperFigure?.intents[0].effects[0]).toEqual(
      expect.objectContaining({
        type: 'ABNORMAL_MOVE',
        move: expect.objectContaining({
          type: 'add_fouled_scroll',
        }),
      }),
    )

    const fleeingNamePaperHorse = getEnemyDefinition('enemy_fleeing_name_paper_horse', data)
    expect(fleeingNamePaperHorse?.traits).toContain('cover_name')
    expect(fleeingNamePaperHorse?.intents[0].effects[0]).toEqual(
      expect.objectContaining({
        type: 'ABNORMAL_MOVE',
        move: expect.objectContaining({
          type: 'cover_name',
        }),
      }),
    )

    const offeringTableAfterimage = getEnemyDefinition('enemy_offering_table_afterimage', data)
    expect(offeringTableAfterimage?.tier).toBe('minion')
    expect(offeringTableAfterimage?.intents[0].effects[0]).toEqual(
      expect.objectContaining({
        type: 'ABNORMAL_MOVE',
        move: expect.objectContaining({
          type: 'heal_form',
        }),
      }),
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

    const fireFleeingName = getEnemyDefinition('enemy_fire_fleeing_name', data)
    expect(fireFleeingName?.tier).toBe('elite')
    expect(fireFleeingName?.nameSlots).toBe(3)
    expect(fireFleeingName?.intents.map((intent) => intent.kind)).toEqual([
      'incoming_force',
      'abnormal_move',
      'incoming_force',
    ])

    const dipperEmptyShell = getEnemyDefinition('enemy_dipper_empty_shell', data)
    expect(dipperEmptyShell?.tier).toBe('elite')
    expect(dipperEmptyShell?.traits).toEqual(
      expect.arrayContaining(['altar', 'artifact', 'cover_name']),
    )

    const registryThief = getEnemyDefinition('enemy_registry_thief', data)
    expect(registryThief?.tier).toBe('boss')
    expect(registryThief?.maxForm).toBe(84)
    expect(registryThief?.nameSlots).toBe(3)
    expect(registryThief?.intents.map((intent) => intent.kind)).toEqual([
      'incoming_force',
      'abnormal_move',
      'abnormal_move',
      'abnormal_move',
      'incoming_force',
    ])

    expect(data.encounters.map((encounter) => encounter.enemyDefinitionId)).toEqual([
      'enemy_paper_wraith',
      'enemy_incense_thief_mouse',
      'enemy_bronze_bell_patrol',
      'enemy_unlit_temple_warden',
      'enemy_fortune_breaker',
      'enemy_ash_altar_child',
      'enemy_nameless_paper_imp',
      'enemy_incense_ash_louse',
      'enemy_unlit_temple_warden',
      'enemy_bronze_bell_patrol',
      'enemy_plague_paper_figure',
      'enemy_scroll_stuffer_clerk',
      'enemy_fleeing_name_paper_horse',
      'enemy_offering_table_afterimage',
      'enemy_plague_paper_figure',
      'enemy_scroll_stuffer_clerk',
      'enemy_fleeing_name_paper_horse',
      'enemy_offering_table_afterimage',
      'enemy_paper_wraith',
      'enemy_incense_thief_mouse',
      'enemy_incense_thief_mouse',
      'enemy_incense_clerk',
      'enemy_fire_fleeing_name',
      'enemy_dipper_empty_shell',
      'enemy_registry_thief',
    ])
  })

  it('keeps encounter enemy, event card, shop card, and route references valid', () => {
    const data = loadGameData()
    const enemyIds = new Set(data.enemies.map((enemy) => enemy.id))
    const encounterIds = new Set(data.encounters.map((encounter) => encounter.id))
    const eventIds = new Set(data.events.map((event) => event.id))
    const cardIds = new Set(data.cards.map((card) => card.id))

    expect(data.encounters.every((encounter) => enemyIds.has(encounter.enemyDefinitionId))).toBe(
      true,
    )
    expect(
      data.encounters.every((encounter) =>
        (encounter.enemySlots ?? []).every((slot) => enemyIds.has(slot.enemyDefinitionId)),
      ),
    ).toBe(true)
    expect(
      data.events.every((event) =>
        event.options.every((option) =>
          option.effects.every((effect) => {
            if (effect.type === 'ADD_CARD') {
              return cardIds.has(effect.cardDefinitionId)
            }

            if (effect.type === 'REMOVE_CARD' && effect.cardDefinitionId) {
              return cardIds.has(effect.cardDefinitionId)
            }

            return true
          }),
        ),
      ),
    ).toBe(true)
    expect(
      data.shopItems.every((item) => !item.cardDefinitionId || cardIds.has(item.cardDefinitionId)),
    ).toBe(true)
    expect(
      data.routes.every((route) =>
        route.nodes.every(
          (node) =>
            (!node.encounterId || encounterIds.has(node.encounterId)) &&
            (node.encounterPoolIds?.every((encounterId) => encounterIds.has(encounterId)) ??
              true) &&
            (node.eventPoolIds?.every((eventId) => eventIds.has(eventId)) ?? true),
        ),
      ),
    ).toBe(true)
  })

  it('contains the route skeleton with T28 boss closure wiring', () => {
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
      'shop',
      'rest',
      'elite',
      'event',
      'normal_battle',
      'elite',
      'normal_battle',
      'elite',
      'event',
      'normal_battle',
      'boss',
    ])
    expect(route.nodes.filter((node) => node.isPlaceholder).map((node) => node.type)).toEqual([])
    expect(route.nodes.find((node) => node.type === 'event')?.eventPoolIds).toEqual([
      'event_mid_ink_pool',
      'event_abandoned_registry_desk',
      'event_ash_altar_lamp',
      'event_cinnabar_scribe',
      'event_cracked_registry_needle',
    ])
    expect(route.nodes.find((node) => node.type === 'event')?.nextNodeIds).toEqual([
      'route_node_first_shop',
    ])
    expect(route.nodes.find((node) => node.type === 'shop')?.nextNodeIds).toEqual([
      'route_node_rest_site',
    ])
    expect(route.nodes.find((node) => node.type === 'elite')?.nextNodeIds).toEqual([
      'route_node_mid_event',
    ])
    expect(
      route.nodes.find((node) => node.id === 'route_node_unlit_temple_warden')
        ?.encounterPoolIds,
    ).toEqual([
      'encounter_mid_unlit_temple_warden',
      'encounter_mid_fortune_breaker',
      'encounter_mid_ash_altar_child',
      'encounter_pool_bronze_bell_patrol_return',
      'encounter_multi_paper_wraith_imp',
      'encounter_multi_thief_mouse_louse',
    ])
    expect(
      route.nodes.find((node) => node.id === 'route_node_late_fleeing_name_paper_horse')
        ?.encounterPoolIds,
    ).toEqual([
      'encounter_late_fleeing_name_paper_horse',
      'encounter_pool_fleeing_name_paper_horse_return',
      'encounter_pool_offering_table_afterimage_return',
      'encounter_multi_offering_table_mouse',
    ])
    expect(
      route.nodes.filter((node) => node.type === 'event').map((node) => node.eventPoolIds?.length),
    ).toEqual([5, 4, 5])
    expect(route.nodes.find((node) => node.type === 'boss')?.nextNodeIds).toEqual([])
    expect(route.nodes.flatMap((node) => node.encounterId ?? [])).toEqual([
      'encounter_tutorial_paper_wraith',
      'encounter_tutorial_incense_thief_mouse',
      'encounter_tutorial_bronze_bell_patrol',
      'encounter_mid_unlit_temple_warden',
      'encounter_elite_incense_clerk',
      'encounter_late_plague_paper_figure',
      'encounter_elite_fire_fleeing_name',
      'encounter_late_scroll_stuffer_clerk',
      'encounter_elite_dipper_empty_shell',
      'encounter_late_fleeing_name_paper_horse',
      'encounter_boss_registry_thief',
    ])
  })

  it('expands the early card pool across break form, ask name, and seal momentum', () => {
    const data = loadGameData()
    const cardsByDirection = {
      breakForm: data.cards.filter((card) => card.tags.includes('break_form')),
      askName: data.cards.filter((card) => card.tags.includes('ask_name')),
      sealMomentum: data.cards.filter((card) => card.tags.includes('seal_momentum')),
    }

    expect(cardsByDirection.breakForm).toHaveLength(13)
    expect(cardsByDirection.askName).toHaveLength(15)
    expect(cardsByDirection.sealMomentum).toHaveLength(9)
    expect(data.cards.filter((card) => card.tags.includes('reward'))).toHaveLength(35)
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
    expect(hasNonAsciiKey(data.events)).toBe(false)
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

  it('keeps every event display key covered by localization', () => {
    const data = loadGameData()
    const eventLocalizationKeys = data.events.flatMap((event) => [
      event.nameKey,
      event.descriptionKey,
      ...event.options.flatMap((option) => [
        option.nameKey,
        option.descriptionKey,
        option.rewardKey,
        option.costKey,
      ]),
    ])

    expect(eventLocalizationKeys.every((key) => data.localization[key])).toBe(true)
  })

  it('keeps every shop item display key covered by localization', () => {
    const data = loadGameData()
    const shopLocalizationKeys = data.shopItems.flatMap((item) => [
      item.nameKey,
      item.descriptionKey,
    ])

    expect(shopLocalizationKeys.every((key) => data.localization[key])).toBe(true)
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
