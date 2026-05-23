import { appendLog } from '../log/actionLog'
import { breakEnemyForm, selectEnemyTargets } from './shapeResolver'
import type {
  CombatState,
  EnemyInstanceId,
  GameEntityId,
} from '../../types'

export interface ApplyShapeStatusInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly amount: number
  readonly targetType?: 'selected_enemy' | 'all_enemies'
}

export interface TriggerShapeStatusInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly targetType?: 'selected_enemy' | 'all_enemies'
}

export function applyFireMark(
  state: CombatState,
  input: ApplyShapeStatusInput,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, input.targetEnemyInstanceId, input.targetType)
  let nextState = state

  for (const target of targets) {
    const currentTarget = findEnemy(nextState, target.instanceId)
    const currentFireMark = currentTarget?.fireMark ?? 0
    const nextFireMark = currentFireMark + input.amount

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              fireMark: nextFireMark,
            }
          : enemy,
      ),
    }

    nextState = appendLog(nextState, {
      type: 'FIRE_MARK_APPLIED',
      sourceId: input.sourceId,
      targetId: target.instanceId,
      payload: {
        amount: input.amount,
        currentFireMark: nextFireMark,
      },
    })
  }

  return nextState
}

export function triggerFireMark(
  state: CombatState,
  input: TriggerShapeStatusInput,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, input.targetEnemyInstanceId, input.targetType)
  let nextState = state

  for (const selectedTarget of targets) {
    const target = findEnemy(nextState, selectedTarget.instanceId)
    const fireMark = target?.fireMark ?? 0

    if (!target || fireMark <= 0) {
      continue
    }

    nextState = triggerSingleFireMark(nextState, target.instanceId, input.sourceId, fireMark)
  }

  return nextState
}

export function triggerFireMarksAtTurnEnd(state: CombatState): CombatState {
  let nextState = state

  for (const enemy of state.enemies) {
    const fireMark = enemy.fireMark ?? 0

    if (enemy.currentForm <= 0 || fireMark <= 0) {
      continue
    }

    nextState = triggerSingleFireMark(nextState, enemy.instanceId, 'fire_mark', fireMark)
  }

  return nextState
}

export function applyThunderLead(
  state: CombatState,
  input: ApplyShapeStatusInput,
): CombatState {
  const target = selectEnemyTargets(state.enemies, input.targetEnemyInstanceId)[0]

  if (!target) {
    return state
  }

  const nextThunderLead = (target.thunderLead ?? 0) + input.amount
  const nextState = {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.instanceId === target.instanceId
        ? {
            ...enemy,
            thunderLead: nextThunderLead,
          }
        : enemy,
    ),
  }

  return appendLog(nextState, {
    type: 'THUNDER_LEAD_APPLIED',
    sourceId: input.sourceId,
    targetId: target.instanceId,
    payload: {
      amount: input.amount,
      currentThunderLead: nextThunderLead,
    },
  })
}

export function triggerThunderLead(
  state: CombatState,
  targetEnemyInstanceId: EnemyInstanceId,
  sourceId: GameEntityId,
): CombatState {
  const target = findEnemy(state, targetEnemyInstanceId)
  const thunderLead = target?.thunderLead ?? 0

  if (!target || thunderLead <= 0) {
    return state
  }

  const nextState = breakEnemyForm(state, {
    sourceId,
    targetEnemyInstanceId: target.instanceId,
    amount: thunderLead,
    consumeBreakShapeBonuses: false,
    logFormBroken: false,
  })
  const updatedTarget = findEnemy(nextState, target.instanceId)
  const brokenAmount = target.currentForm - (updatedTarget?.currentForm ?? target.currentForm)
  const stateAfterLeadSpent = {
    ...nextState,
    enemies: nextState.enemies.map((enemy) =>
      enemy.instanceId === target.instanceId
        ? {
            ...enemy,
            thunderLead: 0,
          }
        : enemy,
    ),
  }

  return appendLog(stateAfterLeadSpent, {
    type: 'THUNDER_LEAD_TRIGGERED',
    sourceId,
    targetId: target.instanceId,
    payload: {
      amount: brokenAmount,
      requestedAmount: thunderLead,
      currentForm: updatedTarget?.currentForm ?? target.currentForm,
      remainingThunderLead: 0,
    },
  })
}

function triggerSingleFireMark(
  state: CombatState,
  targetEnemyInstanceId: EnemyInstanceId,
  sourceId: GameEntityId,
  fireMark: number,
): CombatState {
  const target = findEnemy(state, targetEnemyInstanceId)

  if (!target) {
    return state
  }

  const nextState = breakEnemyForm(state, {
    sourceId,
    targetEnemyInstanceId,
    amount: fireMark,
    consumeBreakShapeBonuses: false,
    logFormBroken: false,
  })
  const updatedTarget = findEnemy(nextState, targetEnemyInstanceId)
  const remainingFireMark = Math.max(0, fireMark - 1)
  const brokenAmount = target.currentForm - (updatedTarget?.currentForm ?? target.currentForm)
  const stateAfterFireMarkDecay = {
    ...nextState,
    enemies: nextState.enemies.map((enemy) =>
      enemy.instanceId === targetEnemyInstanceId
        ? {
            ...enemy,
            fireMark: remainingFireMark,
          }
        : enemy,
    ),
  }

  return appendLog(stateAfterFireMarkDecay, {
    type: 'FIRE_MARK_TRIGGERED',
    sourceId,
    targetId: targetEnemyInstanceId,
    payload: {
      amount: brokenAmount,
      requestedAmount: fireMark,
      currentForm: updatedTarget?.currentForm ?? target.currentForm,
      remainingFireMark,
    },
  })
}

function findEnemy(state: CombatState, enemyInstanceId: EnemyInstanceId) {
  return state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId)
}
