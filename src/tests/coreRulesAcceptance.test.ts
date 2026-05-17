import { describe, expect, it } from 'vitest'
import { createInitialBattleState, reduceBattleState, type BattleReducerContext } from '../core'
import { gameData } from '../data'
import type { CardId, CombatState, EnemyDefinition } from '../types'

const paperWraith = getPaperWraith()
const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T06 core rule acceptance', () => {
  it('reduces enemy form when a break-form card is played', () => {
    const state = createBattle(['card_zhu_fu'])
    const nextState = playFirstCard(state, 'card_zhu_fu')

    expect(state.enemies[0].currentForm).toBe(18)
    expect(nextState.enemies[0].currentForm).toBe(14)
    expect(nextState.actionLog.map((entry) => entry.type)).toContain('FORM_BROKEN')
  })

  it('reveals one name slot when ask-name is played', () => {
    const state = createBattle(['card_ask_name'])
    const nextState = playFirstCard(state, 'card_ask_name')

    expect(nextState.enemies[0].nameSlots).toEqual([
      expect.objectContaining({ index: 0, isRevealed: true }),
      expect.objectContaining({ index: 1, isRevealed: false }),
    ])
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['NAME_ASKED', 'NAME_SLOT_REVEALED']),
    )
  })

  it('marks the enemy named after all name slots are revealed', () => {
    const state = createBattle(['card_ask_name', 'card_ask_name'])
    const afterFirstAsk = playFirstCard(state, 'card_ask_name')
    const afterSecondAsk = playFirstCard(afterFirstAsk, 'card_ask_name')

    expect(afterSecondAsk.enemies[0].nameSlots.every((slot) => slot.isRevealed)).toBe(true)
    expect(afterSecondAsk.enemies[0].isNamed).toBe(true)
    expect(afterSecondAsk.actionLog.map((entry) => entry.type)).toContain('ENEMY_NAMED')
  })

  it('triggers name break only once after naming', () => {
    const state = createBattle(['card_ask_name', 'card_ask_name', 'card_ask_name'])
    const afterFirstAsk = playFirstCard(state, 'card_ask_name')
    const afterSecondAsk = playFirstCard(afterFirstAsk, 'card_ask_name')
    const afterThirdAsk = playFirstCard(afterSecondAsk, 'card_ask_name')

    expect(afterSecondAsk.enemies[0].currentForm).toBe(12)
    expect(afterThirdAsk.enemies[0].currentForm).toBe(12)
    expect(afterThirdAsk.enemies[0].hasTriggeredNameBreak).toBe(true)
    expect(
      afterThirdAsk.actionLog.filter((entry) => entry.type === 'NAME_BREAK_TRIGGERED'),
    ).toHaveLength(1)
  })

  it('settles as vanquish when form reaches zero before naming', () => {
    const state = withEnemyCurrentForm(createBattle(['card_zhu_fu']), 4)
    const nextState = playFirstCard(state, 'card_zhu_fu')

    expect(nextState.phase).toBe('victory')
    expect(nextState.result).toEqual({
      status: 'victory',
      settlement: 'vanquish',
      enemyInstanceId: state.enemies[0].instanceId,
    })
  })

  it('settles as catalogue when form reaches zero after naming', () => {
    const state = createBattle(['card_ask_name', 'card_ask_name', 'card_zhu_fu'])
    const afterFirstAsk = playFirstCard(state, 'card_ask_name')
    const afterSecondAsk = playFirstCard(afterFirstAsk, 'card_ask_name')
    const readyToFinish = withEnemyCurrentForm(afterSecondAsk, 5)
    const nextState = playFirstCard(readyToFinish, 'card_zhu_fu')

    expect(nextState.phase).toBe('victory')
    expect(nextState.result).toEqual({
      status: 'victory',
      settlement: 'catalogue',
      enemyInstanceId: state.enemies[0].instanceId,
    })
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['ENEMY_NAMED', 'NAME_BREAK_TRIGGERED', 'VICTORY_SETTLED']),
    )
  })

  it('rejects card play when incense is insufficient', () => {
    const state = withPlayerIncense(createBattle(['card_zhu_fu']), 0)
    const nextState = playFirstCard(state, 'card_zhu_fu')
    const lastLog = nextState.actionLog[nextState.actionLog.length - 1]

    expect(nextState.enemies[0].currentForm).toBe(18)
    expect(nextState.hand).toHaveLength(1)
    expect(lastLog).toEqual(
      expect.objectContaining({
        type: 'CARD_PLAY_REJECTED',
        payload: expect.objectContaining({ reason: 'not_enough_incense' }),
      }),
    )
  })

  it('shuffles discard pile back into draw pile when drawing from an empty draw pile', () => {
    const state = createBattle(['card_zhu_fu'])
    const afterPlay = playFirstCard(state, 'card_zhu_fu')
    const nextTurn = reduceBattleState(afterPlay, { type: 'END_TURN' }, context)

    expect(nextTurn.hand.some((card) => card.definitionId === 'card_zhu_fu')).toBe(true)
    expect(nextTurn.drawPile).toHaveLength(0)
    expect(nextTurn.discardPile).toHaveLength(0)
    expect(nextTurn.actionLog.map((entry) => entry.type)).toContain('PILE_SHUFFLED')
  })
})

function createBattle(deckDefinitionIds: readonly CardId[]) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: paperWraith,
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

function withPlayerIncense(state: CombatState, incense: number): CombatState {
  return {
    ...state,
    player: {
      ...state.player,
      incense,
    },
  }
}

function withEnemyCurrentForm(state: CombatState, currentForm: number): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            currentForm,
          }
        : enemy,
    ),
  }
}

function getPaperWraith(): EnemyDefinition {
  const enemy = gameData.enemies.find((candidate) => candidate.id === 'enemy_paper_wraith')

  if (!enemy) {
    throw new Error('Missing enemy_paper_wraith test data')
  }

  return enemy
}
