import { appendLog } from '../log/actionLog'
import { drawCards } from './drawResolver'
import { triggerHeavenAltars } from './altarResolver'
import { settleVictoryIfNeeded } from './victoryResolver'
import type { CombatState } from '../../types'

export function startPlayerTurn(state: CombatState, drawCount: number): CombatState {
  const incensePenalty = state.nextTurnIncensePenalty
  const incenseBonus = state.nextTurnIncenseBonus
  const turnIncense = Math.max(0, state.player.maxIncense - incensePenalty) + incenseBonus
  let nextState: CombatState = {
    ...state,
    nextTurnIncensePenalty: 0,
    nextTurnIncenseBonus: 0,
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
      incenseBonus,
    },
  })

  nextState = triggerHeavenAltars(nextState)
  nextState = settleVictoryIfNeeded(nextState)

  if (nextState.result.status !== 'ongoing') {
    return nextState
  }

  return drawCards(nextState, drawCount)
}
