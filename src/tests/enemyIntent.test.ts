import { describe, expect, it } from 'vitest'
import { createInitialBattleState, reduceBattleState, type BattleReducerContext } from '../core'
import { gameData } from '../data'
import type { CardId, CombatState, EnemyDefinition, EnemyId } from '../types'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T07 incoming force, sealing, and abnormal moves', () => {
  it('lets seal-force cards reduce only the current incoming force', () => {
    const state = createBattle('enemy_paper_wraith', ['card_guard_desk_talisman'])

    expect(state.enemies[0].incomingForce).toBe(5)

    const afterSeal = playFirstCard(state, 'card_guard_desk_talisman')

    expect(afterSeal.enemies[0].incomingForce).toBe(2)
    expect(lastLogOfType(afterSeal, 'INCOMING_FORCE_SEALED')?.payload).toEqual(
      expect.objectContaining({
        amount: 3,
        remainingIncomingForce: 2,
      }),
    )

    const nextTurn = reduceBattleState(afterSeal, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'INCOMING_FORCE_CREATED')?.payload).toEqual(
      expect.objectContaining({
        amount: 2,
        baseAmount: 5,
      }),
    )
    expect(nextTurn.enemies[0].incomingForce).toBe(5)
  })

  it('executes steal-incense as an abnormal move that seal-force cannot reduce', () => {
    const state = createBattle('enemy_incense_thief_mouse', ['card_guard_desk_talisman'])

    expect(state.enemies[0].currentIntent?.kind).toBe('abnormal_move')
    expect(state.enemies[0].incomingForce).toBe(0)

    const afterSeal = playFirstCard(state, 'card_guard_desk_talisman')

    expect(afterSeal.enemies[0].incomingForce).toBe(0)
    expect(lastLogOfType(afterSeal, 'INCOMING_FORCE_SEALED')?.payload).toEqual(
      expect.objectContaining({
        amount: 0,
        remainingIncomingForce: 0,
      }),
    )

    const nextTurn = reduceBattleState(afterSeal, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        nextTurnIncensePenalty: 1,
      }),
    )
    expect(nextTurn.player.incense).toBe(2)
    expect(nextTurn.nextTurnIncensePenalty).toBe(0)
  })

  it('lets a dedicated counter prevent the abnormal move', () => {
    const state = createBattle('enemy_incense_thief_mouse', ['card_cut_supply_talisman'])
    const afterCounter = playFirstCard(state, 'card_cut_supply_talisman')

    expect(afterCounter.enemies[0].blockedAbnormalMoveTypes).toContain('steal_incense')
    expect(lastLogOfType(afterCounter, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        result: 'prepared',
      }),
    )

    const nextTurn = reduceBattleState(afterCounter, { type: 'END_TURN' }, context)

    expect(nextTurn.actionLog.some((entry) => entry.type === 'ABNORMAL_MOVE_EXECUTED')).toBe(false)
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        result: 'prevented',
      }),
    )
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.enemies[0].blockedAbnormalMoveTypes).toHaveLength(0)
  })
})

function createBattle(enemyDefinitionId: EnemyId, deckDefinitionIds: readonly CardId[]) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: getEnemy(enemyDefinitionId),
    deckDefinitionIds,
  })
}

function playFirstCard(state: CombatState, definitionId: CardId) {
  const card = state.hand.find((candidate) => candidate.definitionId === definitionId)

  if (!card) {
    throw new Error(`Expected card in hand: ${definitionId}`)
  }

  return reduceBattleState(
    state,
    {
      type: 'PLAY_CARD',
      cardInstanceId: card.instanceId,
      targetEnemyInstanceId: state.enemies[0].instanceId,
    },
    context,
  )
}

function getEnemy(definitionId: EnemyId): EnemyDefinition {
  const enemy = gameData.enemies.find((candidate) => candidate.id === definitionId)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${definitionId}`)
  }

  return enemy
}

function lastLogOfType(state: CombatState, type: CombatState['actionLog'][number]['type']) {
  const entries = state.actionLog.filter((entry) => entry.type === type)

  return entries[entries.length - 1]
}
