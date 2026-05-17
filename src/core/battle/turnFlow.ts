import { appendLog } from '../log/actionLog'
import type { CardInstance, CombatState } from '../../types'

export function startPlayerTurn(state: CombatState, drawCount: number): CombatState {
  let nextState: CombatState = {
    ...state,
    phase: 'player_turn',
    player: {
      ...state.player,
      incense: state.player.maxIncense,
    },
  }

  nextState = appendLog(nextState, {
    type: 'TURN_STARTED',
    sourceId: 'system',
    payload: {
      turn: nextState.turn,
    },
  })

  nextState = appendLog(nextState, {
    type: 'INCENSE_GAINED',
    sourceId: 'player',
    payload: {
      amount: nextState.player.maxIncense,
      currentIncense: nextState.player.incense,
    },
  })

  return drawCards(nextState, drawCount)
}

export function drawCards(state: CombatState, count: number): CombatState {
  let nextState = state

  for (let index = 0; index < count; index += 1) {
    nextState = drawOneCard(nextState)
  }

  return nextState
}

export function discardHand(state: CombatState): CombatState {
  let nextState = state

  for (const card of state.hand) {
    nextState = appendLog(nextState, {
      type: 'CARD_DISCARDED',
      sourceId: card.instanceId,
      payload: {
        cardDefinitionId: card.definitionId,
      },
    })
  }

  return {
    ...nextState,
    hand: [],
    discardPile: [...nextState.discardPile, ...state.hand],
  }
}

function drawOneCard(state: CombatState): CombatState {
  let nextState = ensureDrawablePile(state)

  const [drawnCard, ...remainingDrawPile] = nextState.drawPile

  if (!drawnCard) {
    return nextState
  }

  nextState = {
    ...nextState,
    drawPile: remainingDrawPile,
    hand: [...nextState.hand, drawnCard],
  }

  return appendLog(nextState, {
    type: 'CARD_DRAWN',
    sourceId: drawnCard.instanceId,
    payload: {
      cardDefinitionId: drawnCard.definitionId,
      drawPileCount: nextState.drawPile.length,
      handCount: nextState.hand.length,
    },
  })
}

function ensureDrawablePile(state: CombatState): CombatState {
  if (state.drawPile.length > 0 || state.discardPile.length === 0) {
    return state
  }

  const shuffled = deterministicShuffle(state.discardPile)

  const nextState = {
    ...state,
    drawPile: shuffled,
    discardPile: [],
  }

  return appendLog(nextState, {
    type: 'PILE_SHUFFLED',
    sourceId: 'system',
    payload: {
      count: shuffled.length,
    },
  })
}

function deterministicShuffle(cards: readonly CardInstance[]): readonly CardInstance[] {
  return [...cards].reverse()
}
