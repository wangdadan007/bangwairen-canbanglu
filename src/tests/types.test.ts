import { describe, expect, it } from 'vitest'
import type {
  ActionLogEntry,
  ArtifactCollectionState,
  ArtifactDefinition,
  CardDefinition,
  CardInstance,
  CombatState,
  EncounterDefinition,
  EnemyDefinition,
  EventDefinition,
  RouteDefinition,
  RouteState,
  TutorialRestOption,
  TutorialShopItemDefinition,
  TutorialRunState,
} from '../types'

describe('core type contracts', () => {
  it('accepts data-driven card and enemy definitions', () => {
    const card = {
      id: 'card_zhu_fu',
      nameKey: 'card.zhu_fu.name',
      descriptionKey: 'card.zhu_fu.description',
      rulesTextKey: 'card.zhu_fu.rules',
      cost: 1,
      type: 'talisman',
      unlockStage: 'stage_core',
      tags: ['starter', 'break_form'],
      effects: [
        {
          type: 'BREAK_SHAPE',
          target: 'selected_enemy',
          amount: 4,
        },
      ],
    } satisfies CardDefinition

    const enemy = {
      id: 'enemy_paper_wraith',
      nameKey: 'enemy.paper_wraith.name',
      maxForm: 18,
      nameSlots: 2,
      tier: 'normal',
      traits: ['tutorial'],
      intents: [
        {
          id: 'intent_paper_cut',
          nameKey: 'enemy.paper_wraith.intent.paper_cut',
          kind: 'incoming_force',
          effects: [
            {
              type: 'INCOMING_FORCE',
              amount: 5,
            },
          ],
        },
      ],
    } satisfies EnemyDefinition

    expect(card.effects[0].type).toBe('BREAK_SHAPE')
    expect(enemy.maxForm).toBe(18)
  })

  it('accepts artifact definition and state contracts', () => {
    const artifact = {
      id: 'artifact_whip_fragment',
      nameKey: 'artifact.whip_fragment.name',
      descriptionKey: 'artifact.whip_fragment.description',
      rulesTextKey: 'artifact.whip_fragment.rules',
      triggerType: 'battle_trigger',
      unlockStage: 'stage_red_ink_preview',
      tags: ['chapter_one', 'break_form'],
      baseEffect: {
        type: 'next_break_shape_bonus',
        amount: 2,
        descriptionKey: 'artifact.whip_fragment.effect.base',
      },
      boundEffect: {
        type: 'next_break_shape_bonus',
        amount: 5,
        descriptionKey: 'artifact.whip_fragment.effect.bound',
      },
      bindCondition: {
        kind: 'catalogue_named_enemy',
        requiredCount: 3,
        descriptionKey: 'artifact.whip_fragment.bind',
      },
      overloadCondition: {
        kind: 'vanquish_named_enemy_before_named',
        descriptionKey: 'artifact.whip_fragment.overload',
      },
      backlashEffect: {
        type: 'add_temporary_card',
        amount: 1,
        descriptionKey: 'artifact.whip_fragment.backlash',
      },
    } satisfies ArtifactDefinition

    const artifactState = {
      artifacts: [
        {
          id: artifact.id,
          definitionId: artifact.id,
          bindingStatus: 'unbound',
          bindCondition: artifact.bindCondition,
          bindProgress: 0,
          overloadKind: artifact.overloadCondition.kind,
          chargesRemaining: 0,
          hasTriggeredThisBattle: false,
          triggerCountThisBattle: 0,
          hasOverloadedThisBattle: false,
          consecutiveOverloadBattles: 0,
          pendingBacklash: false,
        },
      ],
    } satisfies ArtifactCollectionState

    expect(artifact.triggerType).toBe('battle_trigger')
    expect(artifactState.artifacts[0].bindingStatus).toBe('unbound')
  })

  it('accepts the tutorial encounter and run contracts', () => {
    const encounter = {
      id: 'encounter_tutorial_paper_wraith',
      nameKey: 'encounter.tutorial.paper_wraith.name',
      enemyDefinitionId: 'enemy_paper_wraith',
      tutorialOrder: 1,
      lessonKey: 'encounter.tutorial.paper_wraith.lesson',
      completionKey: 'encounter.tutorial.paper_wraith.completion',
      unlocksOnVictory: ['stage_abnormal_boundary'],
    } satisfies EncounterDefinition

    const run = {
      status: 'active',
      currentEncounterIndex: 0,
      encounterIds: [encounter.id],
      completedEncounterIds: [],
      settlements: [],
      deckDefinitionIds: ['card_zhu_fu'],
      deckCards: [
        {
          id: 'run_card_001_card_zhu_fu',
          definitionId: 'card_zhu_fu',
          annotations: [],
        },
      ],
      artifacts: {
        artifacts: [],
      },
      currency: {
        incenseMoney: 100,
      },
      resources: {
        ink: 0,
        doom: 0,
        fracture: 0,
      },
      unlocks: {
        stages: ['stage_core'],
        keywords: ['break_form'],
      },
      verdict: {
        maxIncenseBonus: 0,
        registerEntries: [],
        records: [],
      },
      events: {
        completedEventIds: [],
        records: [],
      },
      rests: {
        records: [],
      },
      shops: {
        purchasedItemIds: [],
        records: [],
      },
      rewards: [],
      redInkRecords: [],
    } satisfies TutorialRunState

    expect(run.encounterIds[0]).toBe(encounter.id)
  })

  it('accepts event definition contracts', () => {
    const event = {
      id: 'event_abandoned_registry_desk',
      nameKey: 'event.abandoned_registry_desk.name',
      descriptionKey: 'event.abandoned_registry_desk.description',
      unlockStage: 'stage_core',
      tags: ['chapter_one', 'early', 'card_gain'],
      options: [
        {
          id: 'event_abandoned_registry_desk_take_trace_slip',
          nameKey: 'event.abandoned_registry_desk.option.take_trace_slip.name',
          descriptionKey: 'event.abandoned_registry_desk.option.take_trace_slip.description',
          rewardKey: 'event.abandoned_registry_desk.option.take_trace_slip.reward',
          costKey: 'event.abandoned_registry_desk.option.take_trace_slip.cost',
          flags: [],
          effects: [
            {
              type: 'ADD_CARD',
              cardDefinitionId: 'card_trace_name_slip',
            },
          ],
        },
        {
          id: 'event_abandoned_registry_desk_crack_lamp',
          nameKey: 'event.abandoned_registry_desk.option.crack_lamp.name',
          descriptionKey: 'event.abandoned_registry_desk.option.crack_lamp.description',
          rewardKey: 'event.abandoned_registry_desk.option.crack_lamp.reward',
          costKey: 'event.abandoned_registry_desk.option.crack_lamp.cost',
          flags: ['fracture'],
          effects: [
            {
              type: 'ADD_FRACTURE',
              amount: 1,
            },
            {
              type: 'ADD_INK',
              amount: 1,
            },
          ],
        },
      ],
    } satisfies EventDefinition

    expect(event.options[0].effects[0].type).toBe('ADD_CARD')
    expect(event.options[1].flags).toContain('fracture')
  })

  it('accepts rest option contracts', () => {
    const restOption = {
      id: 'remove_card',
      nameKey: 'rest.option.remove_card.name',
      descriptionKey: 'rest.option.remove_card.description',
      rewardKey: 'rest.option.remove_card.reward',
      costKey: 'rest.option.remove_card.cost',
      requiredUnlockStages: ['stage_core'],
    } satisfies TutorialRestOption

    expect(restOption.id).toBe('remove_card')
  })

  it('accepts shop item contracts', () => {
    const shopItem = {
      id: 'shop_card_trace_name_slip',
      kind: 'card',
      nameKey: 'shop.item.trace_name_slip.name',
      descriptionKey: 'shop.item.trace_name_slip.description',
      cost: 35,
      currency: 'incense_money',
      cardDefinitionId: 'card_trace_name_slip',
      requiredUnlockStages: ['stage_core'],
    } satisfies TutorialShopItemDefinition

    expect(shopItem.currency).toBe('incense_money')
  })

  it('accepts the route definition and state contracts', () => {
    const route = {
      id: 'route_chapter_one_skeleton',
      nameKey: 'route.chapter_one_skeleton.name',
      descriptionKey: 'route.chapter_one_skeleton.description',
      startNodeId: 'route_node_tutorial_paper_wraith',
      nodes: [
        {
          id: 'route_node_tutorial_paper_wraith',
          type: 'normal_battle',
          nameKey: 'route.node.tutorial_paper_wraith.name',
          descriptionKey: 'route.node.tutorial_paper_wraith.description',
          encounterId: 'encounter_tutorial_paper_wraith',
          nextNodeIds: ['route_node_first_event'],
        },
        {
          id: 'route_node_first_event',
          type: 'event',
          nameKey: 'route.node.first_event.name',
          descriptionKey: 'route.node.first_event.description',
          nextNodeIds: [],
          isPlaceholder: true,
        },
      ],
    } satisfies RouteDefinition

    const routeState = {
      routeId: route.id,
      currentNodeId: route.startNodeId,
      completedNodeIds: [],
      reachableNodeIds: [route.startNodeId],
    } satisfies RouteState

    expect(route.nodes[0].type).toBe('normal_battle')
    expect(routeState.currentNodeId).toBe(route.startNodeId)
  })

  it('accepts the first combat state contract', () => {
    const cardInstance = {
      instanceId: 'ci_001',
      definitionId: 'card_zhu_fu',
      owner: 'player',
      isTemporary: false,
      annotations: [],
    } satisfies CardInstance

    const logEntry = {
      id: 'log_001',
      sequence: 1,
      type: 'BATTLE_STARTED',
      turn: 1,
      phase: 'setup',
      sourceId: 'system',
      payload: {
        encounterId: 'encounter_tutorial_001',
      },
    } satisfies ActionLogEntry

    const state = {
      turn: 1,
      phase: 'player_turn',
      player: {
        incense: 3,
        maxIncense: 3,
        deck: [cardInstance],
        unlocks: {
          stages: ['stage_core'],
          keywords: ['break_form'],
        },
      },
      enemies: [
        {
          instanceId: 'ei_001',
          definitionId: 'enemy_paper_wraith',
          maxForm: 18,
          currentForm: 18,
          nameSlots: [
            { index: 0, nameKey: 'enemy.paper_wraith.name_slot.0', isRevealed: false },
            { index: 1, nameKey: 'enemy.paper_wraith.name_slot.1', isRevealed: false },
          ],
          isNamed: false,
          hasTriggeredNameBreak: false,
          intentIndex: 0,
          incomingForce: 5,
          blockedAbnormalMoveTypes: [],
          traits: ['tutorial'],
        },
      ],
      drawPile: [cardInstance],
      hand: [],
      discardPile: [],
      exhaustPile: [],
      nextTurnIncensePenalty: 0,
      resources: {
        ink: 0,
        doom: 0,
        fracture: 0,
      },
      temporaryResourceDelta: {
        ink: 0,
        doom: 0,
        fracture: 0,
      },
      altars: [],
      artifacts: {
        artifacts: [],
      },
      triggeredArtifactIds: [],
      actionLog: [logEntry],
      result: {
        status: 'ongoing',
      },
    } satisfies CombatState

    expect(state.actionLog[0].type).toBe('BATTLE_STARTED')
    expect(state.enemies[0].currentForm).toBe(18)
  })
})
