import { describe, expect, it } from 'vitest'
import { gameData } from '../data'
import {
  createInitialBattleState,
  reduceBattleState,
  type BattleReducerContext,
} from '../core'
import type { CombatState } from '../types'

const paperWraith = gameData.enemies[0]
const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('battle core loop', () => {
  it('starts a battle with incense, hand, draw pile, enemy form, and action log', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
    })

    expect(state.phase).toBe('player_turn')
    expect(state.turn).toBe(1)
    expect(state.player.incense).toBe(3)
    expect(state.hand).toHaveLength(5)
    expect(state.drawPile).toHaveLength(7)
    expect(state.discardPile).toHaveLength(0)
    expect(state.enemies[0].currentForm).toBe(18)
    expect(state.actionLog.map((entry) => entry.type)).toContain('BATTLE_STARTED')
    expect(state.actionLog.map((entry) => entry.type)).toContain('TURN_STARTED')
    expect(state.actionLog.filter((entry) => entry.type === 'CARD_DRAWN')).toHaveLength(5)
  })

  it('plays a break-form card, spends incense, moves it to discard, and logs changes', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
    })
    const zhuFu = state.hand.find((card) => card.definitionId === 'card_zhu_fu')

    if (!zhuFu) {
      throw new Error('Expected Zhu Fu in opening hand')
    }

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(nextState.player.incense).toBe(2)
    expect(nextState.enemies[0].currentForm).toBe(14)
    expect(nextState.hand.some((card) => card.instanceId === zhuFu.instanceId)).toBe(false)
    expect(nextState.discardPile.some((card) => card.instanceId === zhuFu.instanceId)).toBe(true)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['INCENSE_SPENT', 'CARD_PLAYED', 'FORM_BROKEN', 'CARD_DISCARDED']),
    )
  })

  it('rejects card play when incense is insufficient', () => {
    const state = withPlayerIncense(
      createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: paperWraith,
      }),
      0,
    )
    const zhuFu = state.hand.find((card) => card.definitionId === 'card_zhu_fu')

    if (!zhuFu) {
      throw new Error('Expected Zhu Fu in opening hand')
    }

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(nextState.player.incense).toBe(0)
    expect(nextState.enemies[0].currentForm).toBe(18)
    expect(nextState.hand.some((card) => card.instanceId === zhuFu.instanceId)).toBe(true)
    const lastLog = nextState.actionLog[nextState.actionLog.length - 1]
    expect(lastLog?.type).toBe('CARD_PLAY_REJECTED')
    expect(lastLog?.payload.reason).toBe('not_enough_incense')
  })

  it('ends turn, discards hand, executes enemy intent, and starts next turn', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
    })

    const nextState = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(nextState.turn).toBe(2)
    expect(nextState.phase).toBe('player_turn')
    expect(nextState.player.incense).toBe(3)
    expect(nextState.hand).toHaveLength(5)
    expect(nextState.discardPile.length).toBeGreaterThan(0)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['TURN_ENDED', 'CARD_DISCARDED', 'INCOMING_FORCE_CREATED']),
    )
  })

  it('shuffles discard into draw pile when drawing from an empty draw pile', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
      deckDefinitionIds: ['card_zhu_fu'],
    })
    const zhuFu = state.hand[0]

    const afterPlay = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const nextTurn = reduceBattleState(afterPlay, { type: 'END_TURN' }, context)

    expect(nextTurn.hand.some((card) => card.instanceId === zhuFu.instanceId)).toBe(true)
    expect(nextTurn.actionLog.map((entry) => entry.type)).toContain('PILE_SHUFFLED')
  })

  it('settles victory when enemy form reaches zero', () => {
    const state = withEnemyCurrentForm(
      createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: paperWraith,
      }),
      4,
    )
    const zhuFu = state.hand.find((card) => card.definitionId === 'card_zhu_fu')

    if (!zhuFu) {
      throw new Error('Expected Zhu Fu in opening hand')
    }

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(nextState.phase).toBe('victory')
    expect(nextState.result).toEqual({
      status: 'victory',
      settlement: 'vanquish',
      enemyInstanceId: state.enemies[0].instanceId,
    })
    const lastLog = nextState.actionLog[nextState.actionLog.length - 1]
    expect(lastLog?.type).toBe('VICTORY_SETTLED')
  })

  it('tracks T23 ink and doom resource card effects in battle state and action log', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
      deckDefinitionIds: ['card_ink_rubbing_slip', 'card_borrowed_doom_talisman'],
      unlocks: {
        stages: ['stage_core', 'stage_run_resources'],
        keywords: ['ask_name', 'ink', 'doom', 'gain_incense'],
      },
    })
    const inkCard = state.hand.find((card) => card.definitionId === 'card_ink_rubbing_slip')
    const doomCard = state.hand.find((card) => card.definitionId === 'card_borrowed_doom_talisman')

    if (!inkCard || !doomCard) {
      throw new Error('Expected T23 resource cards in opening hand')
    }

    const afterInk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: inkCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterDoom = reduceBattleState(
      afterInk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: doomCard.instanceId,
        targetEnemyInstanceId: afterInk.enemies[0].instanceId,
      },
      context,
    )

    expect(afterInk.resources.ink).toBe(1)
    expect(afterDoom.resources.doom).toBe(1)
    expect(afterDoom.player.incense).toBe(4)
    expect(afterDoom.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['INK_GAINED', 'DOOM_GAINED']),
    )
  })
})

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
