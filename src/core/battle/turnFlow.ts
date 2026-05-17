import { appendLog } from '../log/actionLog'
import { triggerHeavenAltars } from './altarResolver'
import { settleVictoryIfNeeded } from './victoryResolver'
import type { CardInstance, CombatState } from '../../types'

export function startPlayerTurn(state: CombatState, drawCount: number): CombatState {
  const incensePenalty = state.nextTurnIncensePenalty
  const turnIncense = Math.max(0, state.player.maxIncense - incensePenalty)
  let nextState: CombatState = {
    ...state,
    nextTurnIncensePenalty: 0,
    phase: 'player_turn',
    player: {
      ...state.player,
      incense: turnIncense,
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
      amount: turnIncense,
      currentIncense: nextState.player.incense,
      incensePenalty,
    },
  })

  nextState = triggerHeavenAltars(nextState)
  nextState = settleVictoryIfNeeded(nextState)

  if (nextState.result.status !== 'ongoing') {
    return nextState
  }

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
