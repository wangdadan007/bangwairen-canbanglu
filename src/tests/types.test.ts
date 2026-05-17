import { describe, expect, it } from 'vitest'
import type {
  ActionLogEntry,
  CardDefinition,
  CardInstance,
  CombatState,
  EncounterDefinition,
  EnemyDefinition,
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
      unlocks: {
        stages: ['stage_core'],
        keywords: ['break_form'],
      },
      verdict: {
        fracture: 0,
        maxIncenseBonus: 0,
        registerEntries: [],
        records: [],
      },
      rewards: [],
      redInkRecords: [],
    } satisfies TutorialRunState

    expect(run.encounterIds[0]).toBe(encounter.id)
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
      actionLog: [logEntry],
      result: {
        status: 'ongoing',
      },
    } satisfies CombatState

    expect(state.actionLog[0].type).toBe('BATTLE_STARTED')
    expect(state.enemies[0].currentForm).toBe(18)
  })
})
