import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  reduceBattleState,
  spendInkCleanse,
  spendInkGuardName,
} from '../core'
import { getEnemyDefinition, gameData } from '../data'
import type { CombatState } from '../types'

describe('T68 ink battle actions', () => {
  it('spends ink to prepare protection against the next cover-name move', () => {
    const enemy = requireEnemy('enemy_fire_fleeing_name')
    const battle = withRevealedFirstName(
      createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: enemy,
        resources: { ink: 1, doom: 0, fracture: 0 },
        initialEnemyIntentIds: {
          [enemy.id]: 'intent_fire_fleeing_name_burn_name',
        },
      }),
    )
    const guarded = reduceBattleState(
      battle,
      {
        type: 'SPEND_INK_GUARD_NAME',
        targetEnemyInstanceId: battle.enemies[0].instanceId,
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
      },
    )
    const afterEnemyTurn = reduceBattleState(
      guarded,
      {
        type: 'END_TURN',
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: gameData.enemies,
      },
    )

    expect(guarded.resources.ink).toBe(0)
    expect(guarded.enemies[0].blockedAbnormalMoveTypes).toContain('cover_name')
    expect(afterEnemyTurn.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(
      afterEnemyTurn.actionLog.some(
        (entry) =>
          entry.type === 'ABNORMAL_MOVE_COUNTERED' &&
          entry.payload.result === 'prevented' &&
          entry.payload.moveType === 'cover_name',
      ),
    ).toBe(true)
  })

  it('spends ink to restore one covered name slot', () => {
    const enemy = requireEnemy('enemy_fire_fleeing_name')
    const battle = {
      ...createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: enemy,
        resources: { ink: 1, doom: 0, fracture: 0 },
      }),
      enemies: createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: enemy,
      }).enemies.map((candidate) => ({
        ...candidate,
        coveredNameSlotIndices: [0],
      })),
    }

    const restored = spendInkGuardName(battle, battle.enemies[0].instanceId)

    expect(restored.resources.ink).toBe(0)
    expect(restored.enemies[0].coveredNameSlotIndices).toEqual([])
    expect(restored.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(restored.actionLog[restored.actionLog.length - 1]?.type).toBe('NAME_SLOT_REVEALED')
  })

  it('spends ink to cleanse a temporary fouled scroll or doom ash', () => {
    const enemy = requireEnemy('enemy_paper_wraith')
    const battle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: enemy,
      resources: { ink: 1, doom: 0, fracture: 0 },
      extraHandDefinitionIds: ['card_doom_ash'],
    })

    const cleansed = spendInkCleanse(battle)

    expect(cleansed.resources.ink).toBe(0)
    expect(cleansed.hand.some((card) => card.definitionId === 'card_doom_ash')).toBe(false)
    expect(cleansed.exhaustPile.some((card) => card.definitionId === 'card_doom_ash')).toBe(true)
    expect(
      cleansed.actionLog.some(
        (entry) =>
          entry.type === 'INK_SPENT' &&
          entry.payload.action === 'cleanse_card' &&
          entry.payload.cardDefinitionId === 'card_doom_ash',
      ),
    ).toBe(true)
  })
})

function requireEnemy(enemyDefinitionId: string) {
  const enemy = getEnemyDefinition(enemyDefinitionId, gameData)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${enemyDefinitionId}`)
  }

  return enemy
}

function withRevealedFirstName(state: CombatState): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            nameSlots: enemy.nameSlots.map((slot) =>
              slot.index === 0
                ? {
                    ...slot,
                    isRevealed: true,
                  }
                : slot,
            ),
          }
        : enemy,
    ),
  }
}
