import { resolvePlayCard } from './cardResolver'
import { executeEnemyTurn } from './enemyIntentResolver'
import { startPlayerTurn, discardHand } from './turnFlow'
import { appendLog } from '../log/actionLog'
import type { BattleCommand, CardDefinition, CombatState, EnemyDefinition } from '../../types'

export interface BattleReducerContext {
  readonly cardDefinitions: readonly CardDefinition[]
  readonly enemyDefinitions: readonly EnemyDefinition[]
  readonly drawPerTurn?: number
}

export function reduceBattleState(
  state: CombatState,
  command: BattleCommand,
  context: BattleReducerContext,
): CombatState {
  if (state.result.status !== 'ongoing') {
    return state
  }

  if (command.type === 'PLAY_CARD') {
    return resolvePlayCard(state, {
      cardInstanceId: command.cardInstanceId,
      targetEnemyInstanceId: command.targetEnemyInstanceId,
      cardDefinitions: context.cardDefinitions,
    })
  }

  return endPlayerTurn(state, context)
}

function endPlayerTurn(state: CombatState, context: BattleReducerContext): CombatState {
  if (state.phase !== 'player_turn') {
    return state
  }

  let nextState = appendLog(state, {
    type: 'TURN_ENDED',
    sourceId: 'player',
    payload: {
      turn: state.turn,
    },
  })

  nextState = discardHand(nextState)
  nextState = executeEnemyTurn(nextState, context.enemyDefinitions)

  if (nextState.result.status !== 'ongoing') {
    return nextState
  }

  return startPlayerTurn(
    {
      ...nextState,
      turn: nextState.turn + 1,
    },
    context.drawPerTurn ?? 5,
  )
}
