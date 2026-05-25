import { describe, expect, it } from 'vitest'
import { createInitialBattleState, reduceBattleState, type BattleReducerContext } from '../core'
import { gameData } from '../data'
import type { AbnormalMoveType, CardDefinition, EnemyDefinition } from '../types'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T53 chapter-one balance guardrails', () => {
  it('uses tier-specific name-break ratios for ordinary, elite, and boss enemies', () => {
    const ordinary = resolveNamedEnemy('enemy_paper_wraith')
    const elite = resolveNamedEnemy('enemy_fire_fleeing_name')
    const boss = resolveNamedEnemy('enemy_registry_thief')

    expect(getNameBreakLog(ordinary)?.payload.ratio).toBe(0.33)
    expect(ordinary.enemies[0].currentForm).toBe(12)
    expect(getNameBreakLog(elite)?.payload.ratio).toBe(0.24)
    expect(elite.enemies[0].currentForm).toBe(28)
    expect(getNameBreakLog(boss)?.payload.ratio).toBe(0.2)
    expect(boss.enemies[0].currentForm).toBe(56)
  })

  it('keeps every current abnormal move covered by an obtainable counter or earth-altar fallback', () => {
    const abnormalMoves = collectEnemyAbnormalMoves(gameData.enemies)
    const directCounters = collectDirectCounterMoves(gameData.cards)
    const earthAltarFallbacks = collectEarthAltarFallbackMoves(gameData.cards)

    expect([...abnormalMoves].sort()).toEqual([
      'add_fouled_scroll',
      'cover_name',
      'custom',
      'heal_form',
      'steal_incense',
      'summon',
    ])

    for (const moveType of abnormalMoves) {
      expect(directCounters.has(moveType) || earthAltarFallbacks.has(moveType)).toBe(true)
    }
  })
})

function resolveNamedEnemy(enemyDefinitionId: string) {
  const enemyDefinition = getEnemyDefinition(enemyDefinitionId)
  let state = createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition,
    deckDefinitionIds: Array.from({ length: enemyDefinition.nameSlots }, () => 'card_ask_name'),
  })

  for (const card of [...state.hand]) {
    state = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: card.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
  }

  return state
}

function getEnemyDefinition(enemyDefinitionId: string): EnemyDefinition {
  const enemy = gameData.enemies.find((candidate) => candidate.id === enemyDefinitionId)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${enemyDefinitionId}`)
  }

  return enemy
}

function getNameBreakLog(state: ReturnType<typeof resolveNamedEnemy>) {
  return state.actionLog.find((entry) => entry.type === 'NAME_BREAK_TRIGGERED')
}

function collectEnemyAbnormalMoves(enemies: readonly EnemyDefinition[]) {
  const moveTypes = new Set<AbnormalMoveType>()

  for (const enemy of enemies) {
    for (const intent of enemy.intents) {
      for (const effect of intent.effects) {
        if (effect.type === 'ABNORMAL_MOVE') {
          moveTypes.add(effect.move.type)
        }
      }
    }
  }

  return moveTypes
}

function collectDirectCounterMoves(cards: readonly CardDefinition[]) {
  const moveTypes = new Set<AbnormalMoveType>()

  for (const card of cards) {
    for (const effect of card.effects) {
      if (effect.type === 'COUNTER_ABNORMAL_MOVE' && effect.moveType) {
        moveTypes.add(effect.moveType)
      }
    }
  }

  return moveTypes
}

function collectEarthAltarFallbackMoves(cards: readonly CardDefinition[]) {
  const moveTypes = new Set<AbnormalMoveType>()
  let hasGenericEarthCounter = false

  for (const card of cards) {
    for (const effect of card.effects) {
      if (
        effect.type === 'PLACE_ALTAR' &&
        effect.altarSlot === 'earth' &&
        effect.altarEffect.type === 'counter_abnormal_or_gain_ink' &&
        effect.altarEffect.moveType
      ) {
        moveTypes.add(effect.altarEffect.moveType)
      }

      if (
        effect.type === 'PLACE_ALTAR' &&
        effect.altarSlot === 'earth' &&
        effect.altarEffect.type === 'counter_abnormal_or_gain_ink' &&
        !effect.altarEffect.moveType
      ) {
        hasGenericEarthCounter = true
      }
    }
  }

  if (hasGenericEarthCounter) {
    return new Set<AbnormalMoveType>([
      'steal_incense',
      'add_fouled_scroll',
      'heal_form',
      'summon',
      'cover_name',
      'custom',
    ])
  }

  return moveTypes
}
