import { resolvePlayCard } from './cardResolver'
import { executeEnemyTurn } from './enemyIntentResolver'
import { discardHand } from './drawResolver'
import { startPlayerTurn } from './turnFlow'
import { appendLog } from '../log/actionLog'
import { triggerHumanAltars } from './altarResolver'
import { spendInkCleanse, spendInkGuardName } from './inkBattleResolver'
import { resolveIncenseSealUse } from './incenseSealBattleResolver'
import { refreshCurrentIncomingForceModifiers } from './incomingForceResolver'
import { triggerFireMarksAtTurnEnd } from './shapeStatusResolver'
import { settleVictoryIfNeeded } from './victoryResolver'
import type {
  BattleCommand,
  CardDefinition,
  CombatState,
  EnemyDefinition,
  IncenseSealDefinition,
} from '../../types'

export interface BattleReducerContext {
  readonly cardDefinitions: readonly CardDefinition[]
  readonly enemyDefinitions: readonly EnemyDefinition[]
  readonly incenseSealDefinitions?: readonly IncenseSealDefinition[]
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
    return refreshCurrentIncomingForceModifiers(
      resolvePlayCard(state, {
        cardInstanceId: command.cardInstanceId,
        targetEnemyInstanceId: command.targetEnemyInstanceId,
        cardDefinitions: context.cardDefinitions,
      }),
    )
  }

  if (command.type === 'SPEND_INK_GUARD_NAME') {
    return refreshCurrentIncomingForceModifiers(
      spendInkGuardName(state, command.targetEnemyInstanceId),
    )
  }

  if (command.type === 'SPEND_INK_CLEANSE') {
    return refreshCurrentIncomingForceModifiers(spendInkCleanse(state))
  }

  if (command.type === 'USE_INCENSE_SEAL') {
    return refreshCurrentIncomingForceModifiers(
      resolveIncenseSealUse(state, {
        incenseSealInstanceId: command.incenseSealInstanceId,
        targetEnemyInstanceId: command.targetEnemyInstanceId,
        incenseSealDefinitions: context.incenseSealDefinitions ?? [],
      }),
    )
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

  nextState = triggerHumanAltars(nextState)
  nextState = settleVictoryIfNeeded(triggerFireMarksAtTurnEnd(nextState))

  if (nextState.result.status !== 'ongoing') {
    return nextState
  }

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
