import type {
  AbnormalMoveType,
  CombatState,
  EnemyIntentDefinition,
  EnemyState,
  IncomingForceBonusCondition,
} from '../../types'

const FOULED_SCROLL_CARD_ID = 'card_fouled_scroll'
const REGISTRY_THIEF_CATALOGUE_INTENT_ID = 'intent_registry_thief_cloak_stolen_name'
const REGISTRY_THIEF_FRACTURE_INTENT_ID = 'intent_registry_thief_tear_registry'

interface IncomingForceConditionOptions {
  readonly enemyDefinitionId?: string
  readonly moveType?: AbnormalMoveType
  readonly intentId?: string
}

export interface IncomingForceBonusResult {
  readonly amount: number
  readonly condition: IncomingForceBonusCondition
  readonly descriptionKey: string
}

export interface IncomingForceResolution {
  readonly baseAmount: number
  readonly bonusAmount: number
  readonly amount: number
  readonly bonuses: readonly IncomingForceBonusResult[]
}

export function getIncomingForceBaseAmount(intent: EnemyIntentDefinition | undefined): number {
  if (!intent) {
    return 0
  }

  return intent.effects.reduce(
    (total, effect) => total + (effect.type === 'INCOMING_FORCE' ? effect.amount : 0),
    0,
  )
}

export function resolveIncomingForceAmount(
  state: CombatState,
  enemy: EnemyState,
  intent: EnemyIntentDefinition | undefined = enemy.currentIntent,
): IncomingForceResolution {
  if (!intent) {
    return {
      baseAmount: 0,
      bonusAmount: 0,
      amount: 0,
      bonuses: [],
    }
  }

  const bonuses = intent.effects.flatMap((effect) => {
    if (effect.type !== 'INCOMING_FORCE') {
      return []
    }

    return (effect.bonuses ?? [])
      .filter((bonus) => isIncomingForceConditionMet(state, enemy, bonus.condition, bonus))
      .map((bonus) => ({
        amount: Math.max(0, Math.floor(bonus.amount)),
        condition: bonus.condition,
        descriptionKey: bonus.descriptionKey,
      }))
  })
  const baseAmount = getIncomingForceBaseAmount(intent)
  const bonusAmount = bonuses.reduce((total, bonus) => total + bonus.amount, 0)

  return {
    baseAmount,
    bonusAmount,
    amount: baseAmount + bonusAmount,
    bonuses,
  }
}

export function resolveCurrentIncomingForces(state: CombatState): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      incomingForce: resolveIncomingForceAmount(state, enemy).amount,
    })),
  }
}

export function refreshUnsealedCurrentIncomingForceBonuses(state: CombatState): CombatState {
  return refreshCurrentIncomingForceModifiers(state)
}

export function refreshCurrentIncomingForceModifiers(state: CombatState): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) => {
      const baseAmount = getIncomingForceBaseAmount(enemy.currentIntent)
      const resolution = resolveIncomingForceAmount(state, enemy)

      if (enemy.incomingForce > resolution.amount) {
        return {
          ...enemy,
          incomingForce: resolution.amount,
        }
      }

      if (enemy.incomingForce === baseAmount && resolution.amount > baseAmount) {
        return {
          ...enemy,
          incomingForce: resolution.amount,
        }
      }

      return enemy
    }),
  }
}

export function isIncomingForceConditionMet(
  state: CombatState,
  enemy: EnemyState,
  condition: IncomingForceBonusCondition,
  options: IncomingForceConditionOptions = {},
): boolean {
  const currentEnemy = state.enemies.find((candidate) => candidate.instanceId === enemy.instanceId) ?? enemy

  if (condition === 'summoned_enemy_alive') {
    return state.enemies.some(
      (candidate) =>
        candidate.instanceId !== enemy.instanceId &&
        candidate.currentForm > 0 &&
        candidate.definitionId === options.enemyDefinitionId,
    )
  }

  if (condition === 'custom_abnormal_executed_this_turn') {
    return hasExecutedAbnormalMove(state, enemy, {
      moveType: 'custom',
      intentId: options.intentId,
      currentTurnOnly: true,
    })
  }

  if (condition === 'abnormal_move_executed_this_turn') {
    return hasExecutedAbnormalMove(state, enemy, {
      moveType: options.moveType,
      intentId: options.intentId,
      currentTurnOnly: true,
    })
  }

  if (condition === 'fouled_scroll_in_piles') {
    return [...state.drawPile, ...state.hand, ...state.discardPile].some(
      (card) => card.definitionId === FOULED_SCROLL_CARD_ID,
    )
  }

  if (condition === 'covered_name_slot_exists') {
    return currentEnemy.coveredNameSlotIndices.length > 0
  }

  if (condition === 'steal_incense_executed') {
    return hasExecutedAbnormalMove(state, enemy, {
      moveType: 'steal_incense',
      intentId: options.intentId,
      currentTurnOnly: false,
    })
  }

  if (condition === 'altar_active') {
    return state.altars.length > 0
  }

  if (condition === 'boss_route_catalogue') {
    return getBossRouteOpeningIntentId(state, enemy) === REGISTRY_THIEF_CATALOGUE_INTENT_ID
  }

  if (condition === 'boss_route_fracture') {
    return getBossRouteOpeningIntentId(state, enemy) === REGISTRY_THIEF_FRACTURE_INTENT_ID
  }

  return false
}

function hasExecutedAbnormalMove(
  state: CombatState,
  enemy: EnemyState,
  options: {
    readonly moveType?: AbnormalMoveType
    readonly intentId?: string
    readonly currentTurnOnly: boolean
  },
) {
  return state.actionLog.some((entry) => {
    if (
      entry.type !== 'ABNORMAL_MOVE_EXECUTED' ||
      entry.sourceId !== enemy.instanceId ||
      (options.currentTurnOnly && entry.turn !== state.turn)
    ) {
      return false
    }

    if (options.moveType && entry.payload.moveType !== options.moveType) {
      return false
    }

    if (options.intentId && entry.payload.intentId !== options.intentId) {
      return false
    }

    return true
  })
}

function getBossRouteOpeningIntentId(state: CombatState, enemy: EnemyState) {
  const riskIntentLog = state.actionLog.find(
    (entry) =>
      entry.type === 'RISK_THRESHOLD_APPLIED' &&
      entry.targetId === enemy.definitionId &&
      typeof entry.payload.intentId === 'string',
  )

  if (typeof riskIntentLog?.payload.intentId === 'string') {
    return riskIntentLog.payload.intentId
  }

  const highFractureLog = state.actionLog.find(
    (entry) =>
      entry.type === 'RISK_THRESHOLD_APPLIED' &&
      entry.targetId === enemy.definitionId &&
      entry.payload.result === 'boss_high_fracture',
  )

  if (highFractureLog) {
    return REGISTRY_THIEF_FRACTURE_INTENT_ID
  }

  const firstEnemyIntentLog = state.actionLog.find(
    (entry) =>
      entry.sourceId === enemy.instanceId &&
      (entry.type === 'INCOMING_FORCE_CREATED' || entry.type === 'ABNORMAL_MOVE_EXECUTED') &&
      typeof entry.payload.intentId === 'string',
  )

  return typeof firstEnemyIntentLog?.payload.intentId === 'string'
    ? firstEnemyIntentLog.payload.intentId
    : undefined
}
