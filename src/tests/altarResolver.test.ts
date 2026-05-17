import { describe, expect, it } from 'vitest'
import { createInitialBattleState, reduceBattleState, type BattleReducerContext } from '../core'
import { gameData } from '../data'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('altar battle windows', () => {
  it('triggers human altar at end of turn after name progress and grants ink', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: getEnemy('enemy_paper_wraith'),
      deckDefinitionIds: ['card_human_altar_name_sigil', 'card_ask_name'],
    })
    const humanAltarCard = getHandCard(state, 'card_human_altar_name_sigil')
    const askNameCard = getHandCard(state, 'card_ask_name')

    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: humanAltarCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterAskName = reduceBattleState(
      afterAltar,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askNameCard.instanceId,
        targetEnemyInstanceId: afterAltar.enemies[0].instanceId,
      },
      context,
    )
    const nextState = reduceBattleState(afterAskName, { type: 'END_TURN' }, context)

    expect(nextState.resources.ink).toBe(1)
    expect(nextState.altars).toHaveLength(0)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['ALTAR_PLACED', 'ALTAR_TRIGGERED', 'ALTAR_EXPIRED', 'INK_GAINED']),
    )
  })

  it('triggers earth altar before enemy abnormal moves and prevents steal incense', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: getEnemy('enemy_incense_thief_mouse'),
      deckDefinitionIds: ['card_earth_altar_watch'],
    })
    const earthAltarCard = getHandCard(state, 'card_earth_altar_watch')
    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: earthAltarCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const nextState = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)
    const counterLogs = nextState.actionLog.filter(
      (entry) => entry.type === 'ABNORMAL_MOVE_COUNTERED',
    )

    expect(counterLogs.map((entry) => entry.payload.result)).toEqual(['prepared', 'prevented'])
    expect(nextState.nextTurnIncensePenalty).toBe(0)
    expect(nextState.player.incense).toBe(3)
    expect(nextState.altars).toHaveLength(0)
  })

  it('triggers heaven altar on the next player turn and asks name with ink gain', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: getEnemy('enemy_paper_wraith'),
      deckDefinitionIds: ['card_heaven_altar_oracle'],
    })
    const heavenAltarCard = getHandCard(state, 'card_heaven_altar_oracle')
    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: heavenAltarCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const nextState = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(nextState.turn).toBe(2)
    expect(nextState.resources.ink).toBe(1)
    expect(nextState.enemies[0].nameSlots.filter((slot) => slot.isRevealed)).toHaveLength(1)
    expect(nextState.altars).toHaveLength(0)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['ALTAR_TRIGGERED', 'NAME_ASKED', 'NAME_SLOT_REVEALED']),
    )
  })
})

function getEnemy(enemyDefinitionId: string) {
  const enemy = gameData.enemies.find((candidate) => candidate.id === enemyDefinitionId)

  if (!enemy) {
    throw new Error(`Missing test enemy: ${enemyDefinitionId}`)
  }

  return enemy
}

function getHandCard(state: ReturnType<typeof createInitialBattleState>, cardDefinitionId: string) {
  const card = state.hand.find((candidate) => candidate.definitionId === cardDefinitionId)

  if (!card) {
    throw new Error(`Missing test hand card: ${cardDefinitionId}`)
  }

  return card
}
