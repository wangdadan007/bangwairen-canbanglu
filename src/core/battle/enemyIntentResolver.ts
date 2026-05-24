import { appendLog } from '../log/actionLog'
import { applyTutorialResourceDelta } from '../run/resourceResolver'
import { triggerEarthAltars } from './altarResolver'
import { createEnemyState } from './battleState'
import {
  isIncomingForceConditionMet,
  resolveIncomingForceAmount,
} from './incomingForceResolver'
import { triggerLinzhaoAfterAbnormalMovePrevented } from './linzhaoResolver'
import { triggerRegisterAfterAbnormalMoveCountered } from './registerBattleResolver'
import type {
  AbnormalMoveDefinition,
  CardInstance,
  CombatState,
  EnemyDefinition,
  EnemyNamedPhaseCondition,
  FouledScrollDestination,
  EnemyIntentDefinition,
  EnemyState,
  HealFormTarget,
  IncomingForceAftereffectDefinition,
  IncomingForceAftereffectType,
  JsonValue,
} from '../../types'

const FOULED_SCROLL_CARD_ID = 'card_fouled_scroll'
const DEFAULT_FOULED_SCROLL_DESTINATION: FouledScrollDestination = 'discard_pile'
const DEFAULT_SUMMON_LIVING_ENEMY_LIMIT = 3

interface NamedPhaseAdjustment {
  readonly result: 'disabled' | 'downgraded'
  readonly condition?: EnemyNamedPhaseCondition
}

export function executeEnemyTurn(
  state: CombatState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  let nextState: CombatState = {
    ...state,
    phase: 'enemy_turn',
  }

  nextState = triggerEarthAltars(nextState)

  for (const enemy of nextState.enemies) {
    if (nextState.result.status !== 'ongoing') {
      break
    }

    if (enemy.currentForm <= 0) {
      continue
    }

    nextState = executeEnemyIntent(nextState, enemy, enemyDefinitions)
  }

  return nextState
}

function executeEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  if (!enemy.currentIntent) {
    return state
  }

  let nextState = state
  let forceMaskNextIntent = false

  for (const effect of enemy.currentIntent.effects) {
    if (effect.type === 'INCOMING_FORCE') {
      const currentEnemy = getCurrentEnemyState(nextState, enemy)
      const amount = currentEnemy.incomingForce
      const incomingForceResolution = resolveIncomingForceAmount(
        nextState,
        currentEnemy,
        enemy.currentIntent,
      )
      nextState = appendLog(nextState, {
        type: 'INCOMING_FORCE_CREATED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          intentId: enemy.currentIntent.id,
          amount,
          baseAmount: incomingForceResolution.baseAmount,
          bonusAmount: incomingForceResolution.bonusAmount,
          bonusDescriptionKeys: incomingForceResolution.bonuses.map((bonus) => bonus.descriptionKey),
        },
      })
      nextState = applyIncomingForceToPlayer(nextState, enemy, amount)

      if (nextState.result.status === 'ongoing') {
        const aftereffectResult = applyIncomingForceAftereffects(
          nextState,
          currentEnemy,
          effect.aftereffects ?? [],
          amount,
        )
        nextState = aftereffectResult.state
        forceMaskNextIntent = forceMaskNextIntent || aftereffectResult.forceMaskNextIntent
      }
    }

    if (effect.type === 'ABNORMAL_MOVE') {
      nextState = executeAbnormalMove(
        nextState,
        enemy,
        enemy.currentIntent,
        effect.move,
        enemyDefinitions,
      )
    }
  }

  if (nextState.result.status !== 'ongoing') {
    return nextState
  }

  return advanceEnemyIntent(nextState, enemy, enemyDefinitions, {
    forceMaskCurrentIntent: forceMaskNextIntent,
  })
}

function applyIncomingForceToPlayer(
  state: CombatState,
  enemy: EnemyState,
  amount: number,
): CombatState {
  if (amount <= 0) {
    return state
  }

  const nextCurrentForm = Math.max(0, state.player.currentForm - amount)
  let nextState = appendLog(
    {
      ...state,
      player: {
        ...state.player,
        currentForm: nextCurrentForm,
      },
    },
    {
      type: 'PLAYER_FORM_LOST',
      sourceId: enemy.instanceId,
      targetId: 'player',
      payload: {
        amount,
        currentForm: nextCurrentForm,
        maxForm: state.player.maxForm,
      },
    },
  )

  if (nextCurrentForm > 0) {
    return nextState
  }

  nextState = {
    ...nextState,
    phase: 'defeat',
    result: {
      status: 'defeat',
      reasonKey: 'battle.defeat.player_form_broken',
    },
  }

  return appendLog(nextState, {
    type: 'DEFEAT_SETTLED',
    sourceId: enemy.instanceId,
    targetId: 'player',
    payload: {
      reasonKey: 'battle.defeat.player_form_broken',
    },
  })
}

function applyIncomingForceAftereffects(
  state: CombatState,
  enemy: EnemyState,
  aftereffects: readonly IncomingForceAftereffectDefinition[],
  incomingForceAmount: number,
): {
  readonly state: CombatState
  readonly forceMaskNextIntent: boolean
} {
  let nextState = state
  let forceMaskNextIntent = false

  for (const aftereffect of aftereffects) {
    if (
      aftereffect.condition &&
      !isIncomingForceConditionMet(nextState, enemy, aftereffect.condition)
    ) {
      continue
    }

    if (incomingForceAmount <= 0) {
      nextState = appendIncomingForceAftereffectLog(nextState, enemy, aftereffect, {
        result: 'suppressed',
        reason: 'fully_sealed',
      })
      continue
    }

    const namedPhaseAdjustment = getNamedPhaseAftereffectAdjustment(
      nextState,
      enemy,
      aftereffect.type,
    )

    if (namedPhaseAdjustment?.result === 'disabled') {
      nextState = appendIncomingForceAftereffectLog(nextState, enemy, aftereffect, {
        result: 'prevented_by_named_phase',
        ...getNamedPhaseLogPayload(enemy, namedPhaseAdjustment),
      })
      continue
    }

    if (aftereffect.type === 'expire_latest_altar') {
      const result = expireLatestAltarByIncomingForce(nextState, enemy)
      nextState = result.state

      if (!result.expiredAltarId) {
        continue
      }

      nextState = appendIncomingForceAftereffectLog(nextState, enemy, aftereffect, {
        result: 'triggered',
        expiredAltarId: result.expiredAltarId,
        expiredAltarSlot: result.expiredAltarSlot,
      })
      continue
    }

    if (aftereffect.type === 'mask_next_intent') {
      forceMaskNextIntent = true
      nextState = appendIncomingForceAftereffectLog(nextState, enemy, aftereffect, {
        result: 'triggered',
      })
      continue
    }

    if (aftereffect.type === 'add_fouled_scroll') {
      const addedCards = createFouledScrollCards(
        nextState,
        Math.max(1, Math.floor(aftereffect.amount ?? 1)),
      )
      nextState = addFouledScrollCardsToDestination(nextState, addedCards, 'discard_pile')
      nextState = appendIncomingForceAftereffectLog(nextState, enemy, aftereffect, {
        result: 'triggered',
        addedCardDefinitionId: FOULED_SCROLL_CARD_ID,
        addedCardCount: addedCards.length,
        destination: 'discard_pile',
        discardPileCount: nextState.discardPile.length,
      })
    }
  }

  return {
    state: nextState,
    forceMaskNextIntent,
  }
}

function appendIncomingForceAftereffectLog(
  state: CombatState,
  enemy: EnemyState,
  aftereffect: IncomingForceAftereffectDefinition,
  payload: Record<string, JsonValue>,
): CombatState {
  return appendLog(state, {
    type: 'INCOMING_FORCE_AFTEREFFECT',
    sourceId: enemy.instanceId,
    targetId: 'player',
    payload: {
      aftereffectType: aftereffect.type,
      descriptionKey: aftereffect.descriptionKey,
      ...payload,
    },
  })
}

function expireLatestAltarByIncomingForce(
  state: CombatState,
  enemy: EnemyState,
): {
  readonly state: CombatState
  readonly expiredAltarId: string | null
  readonly expiredAltarSlot: string | null
} {
  const altar = state.altars[state.altars.length - 1]

  if (!altar) {
    return {
      state,
      expiredAltarId: null,
      expiredAltarSlot: null,
    }
  }

  const nextState: CombatState = {
    ...state,
    altars: state.altars.filter((candidate) => candidate.id !== altar.id),
  }

  return {
    state: appendLog(nextState, {
      type: 'ALTAR_EXPIRED',
      sourceId: altar.id,
      targetId: altar.targetEnemyInstanceId,
      payload: {
        slot: altar.slot,
        reason: 'shaken_by_incoming_force',
        disruptedByEnemyInstanceId: enemy.instanceId,
      },
    }),
    expiredAltarId: altar.id,
    expiredAltarSlot: altar.slot,
  }
}

function executeAbnormalMove(
  state: CombatState,
  enemy: EnemyState,
  intent: EnemyIntentDefinition,
  move: AbnormalMoveDefinition,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  const intentId = intent.id

  if (enemy.blockedAbnormalMoveTypes.includes(move.type)) {
    const counteredState = appendLog(state, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: enemy.instanceId,
      targetId: 'player',
      payload: {
        intentId,
        intentNameKey: intent.nameKey,
        moveType: move.type,
        result: 'prevented',
      },
    })

    const registerState = triggerRegisterAfterAbnormalMoveCountered(counteredState, {
      sourceId: enemy.instanceId,
      targetId: 'player',
      moveType: move.type,
    })

    return triggerLinzhaoAfterAbnormalMovePrevented(registerState, {
      enemyInstanceId: enemy.instanceId,
    })
  }

  const namedPhaseAdjustment = getNamedPhaseMoveAdjustment(state, enemy, move.type)

  if (namedPhaseAdjustment?.result === 'disabled') {
    return appendLog(state, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: enemy.instanceId,
      targetId: 'player',
      payload: {
        intentId,
        intentNameKey: intent.nameKey,
        moveType: move.type,
        result: 'prevented_by_named_phase',
        ...getNamedPhaseLogPayload(enemy, namedPhaseAdjustment),
      },
    })
  }

  let nextState = state
  const { amount: baseAmount, isFirstUse } = getResolvedMoveAmount(nextState, enemy, intentId, move)
  const isDowngradedByNamedPhase = namedPhaseAdjustment?.result === 'downgraded'
  const amount = getNamedPhaseResolvedMoveAmount(move, baseAmount, isDowngradedByNamedPhase)
  let resultPayload: Record<string, JsonValue> = {}

  if (move.type === 'steal_incense') {
    nextState = {
      ...nextState,
      nextTurnIncensePenalty: nextState.nextTurnIncensePenalty + amount,
    }
    resultPayload = {
      nextTurnIncensePenalty: nextState.nextTurnIncensePenalty,
    }
  }

  if (move.type === 'add_fouled_scroll') {
    const destination = isDowngradedByNamedPhase
      ? DEFAULT_FOULED_SCROLL_DESTINATION
      : getResolvedFouledScrollDestination(move, isFirstUse)
    const addedCards = createFouledScrollCards(nextState, amount)
    nextState = addFouledScrollCardsToDestination(nextState, addedCards, destination)
    resultPayload = {
      addedCardDefinitionId: FOULED_SCROLL_CARD_ID,
      addedCardCount: addedCards.length,
      destination,
      drawPileCount: nextState.drawPile.length,
      discardPileCount: nextState.discardPile.length,
    }
  }

  if (move.type === 'cover_name') {
    const disruptedResult = move.disruptAltar && !isDowngradedByNamedPhase
      ? disruptMostRecentAltar(nextState, enemy)
      : {
          state: nextState,
          disruptedAltarId: null,
          disruptedAltarSlot: null,
        }
    nextState = disruptedResult.state

    if (disruptedResult.disruptedAltarId) {
      resultPayload = {
        coveredSlotIndex: null,
        disruptedAltarId: disruptedResult.disruptedAltarId,
        disruptedAltarSlot: disruptedResult.disruptedAltarSlot,
      }
    } else {
      const { state: coveredState, coveredSlotIndex, result } = coverOneRevealedNameSlot(
        nextState,
        enemy,
      )
      nextState = coveredState
      const fallbackIncomingForce =
        result === 'enemy_named' ? move.whenNamedIncomingForce : move.fallbackIncomingForce
      const fallbackIncomingForceApplied =
        coveredSlotIndex === null && fallbackIncomingForce && fallbackIncomingForce > 0
          ? fallbackIncomingForce
          : 0

      if (fallbackIncomingForceApplied > 0) {
        nextState = applyIncomingForceToPlayer(nextState, enemy, fallbackIncomingForceApplied)
      }

      resultPayload = {
        coveredSlotIndex,
        coverNameResult: result,
        fallbackIncomingForceApplied,
      }
    }
  }

  if (move.type === 'heal_form') {
    const healTarget = selectHealFormTarget(nextState, enemy, move.healTarget ?? 'self')
    const nextCurrentForm = Math.min(healTarget.maxForm, healTarget.currentForm + amount)
    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((candidate) =>
        candidate.instanceId === healTarget.instanceId
          ? {
              ...candidate,
              currentForm: nextCurrentForm,
            }
          : candidate,
      ),
    }
    resultPayload = {
      targetEnemyInstanceId: healTarget.instanceId,
      healedAmount: nextCurrentForm - healTarget.currentForm,
      currentForm: nextCurrentForm,
    }
  }

  if (move.type === 'summon') {
    const summonResult = executeSummonMove(nextState, enemyDefinitions, move, amount)
    nextState = summonResult.state
    resultPayload = summonResult.payload
  }

  if (move.type === 'custom') {
    const customResult = executeCustomMove(nextState, enemy, move)
    nextState = customResult.state
    resultPayload = customResult.payload
  }

  return appendLog(nextState, {
    type: 'ABNORMAL_MOVE_EXECUTED',
    sourceId: enemy.instanceId,
    targetId: 'player',
    payload: {
      intentId,
      intentNameKey: intent.nameKey,
      moveType: move.type,
      amount,
      configuredAmount: move.amount ?? null,
      isFirstUse,
      ...getNamedPhaseLogPayload(enemy, namedPhaseAdjustment),
      ...resultPayload,
    },
  })
}

function getNamedPhaseMoveAdjustment(
  state: CombatState,
  enemy: EnemyState,
  moveType: AbnormalMoveDefinition['type'],
): NamedPhaseAdjustment | undefined {
  const namedPhase = enemy.namedPhase

  if (!namedPhase?.isActive) {
    return undefined
  }

  if (namedPhase.disabledMoveTypes.includes(moveType)) {
    return { result: 'disabled' }
  }

  const conditionalDisabledMove = namedPhase.conditionalDisabledMoveTypes.find(
    (change) =>
      change.moveType === moveType &&
      isNamedPhaseConditionMet(state, enemy, change.condition),
  )

  if (conditionalDisabledMove) {
    return {
      result: 'disabled',
      condition: conditionalDisabledMove.condition,
    }
  }

  if (namedPhase.downgradedMoveTypes.includes(moveType)) {
    return { result: 'downgraded' }
  }

  const conditionalDowngradedMove = namedPhase.conditionalDowngradedMoveTypes.find(
    (change) =>
      change.moveType === moveType &&
      isNamedPhaseConditionMet(state, enemy, change.condition),
  )

  if (conditionalDowngradedMove) {
    return {
      result: 'downgraded',
      condition: conditionalDowngradedMove.condition,
    }
  }

  return undefined
}

function getNamedPhaseAftereffectAdjustment(
  state: CombatState,
  enemy: EnemyState,
  aftereffectType: IncomingForceAftereffectType,
): NamedPhaseAdjustment | undefined {
  const namedPhase = enemy.namedPhase

  if (!namedPhase?.isActive) {
    return undefined
  }

  if (namedPhase.disabledAftereffects.includes(aftereffectType)) {
    return { result: 'disabled' }
  }

  const conditionalDisabledAftereffect = namedPhase.conditionalDisabledAftereffects.find(
    (change) =>
      change.aftereffectType === aftereffectType &&
      isNamedPhaseConditionMet(state, enemy, change.condition),
  )

  if (conditionalDisabledAftereffect) {
    return {
      result: 'disabled',
      condition: conditionalDisabledAftereffect.condition,
    }
  }

  return undefined
}

function isNamedPhaseConditionMet(
  state: CombatState,
  enemy: EnemyState,
  condition: EnemyNamedPhaseCondition,
) {
  if (condition === 'default') {
    return (
      !isIncomingForceConditionMet(state, enemy, 'boss_route_catalogue') &&
      !isIncomingForceConditionMet(state, enemy, 'boss_route_fracture')
    )
  }

  return isIncomingForceConditionMet(state, enemy, condition)
}

function getNamedPhaseResolvedMoveAmount(
  move: AbnormalMoveDefinition,
  amount: number,
  isDowngradedByNamedPhase: boolean,
) {
  if (!isDowngradedByNamedPhase) {
    return amount
  }

  if (move.type === 'steal_incense') {
    return 0
  }

  return amount
}

function getNamedPhaseLogPayload(
  enemy: EnemyState,
  adjustment: NamedPhaseAdjustment | undefined,
): Record<string, JsonValue> {
  const namedPhase = enemy.namedPhase

  if (!adjustment || !namedPhase?.isActive) {
    return {}
  }

  return {
    namedPhaseResult: adjustment.result,
    namedPhaseCondition: adjustment.condition ?? null,
    namedPhaseChangeIds: namedPhase.changeIds,
    namedPhaseDescriptionKeys: namedPhase.descriptionKeys,
    namedPhaseCounterIntentId: namedPhase.counterIntentId ?? null,
  }
}

function executeSummonMove(
  state: CombatState,
  enemyDefinitions: readonly EnemyDefinition[],
  move: AbnormalMoveDefinition,
  resolvedAmount: number,
): {
  readonly state: CombatState
  readonly payload: Record<string, JsonValue>
} {
  const summonDefinitionId = move.summon?.enemyDefinitionId
  const summonDefinition = enemyDefinitions.find((candidate) => candidate.id === summonDefinitionId)
  const requestedCount = Math.max(1, Math.floor(move.summon?.count ?? resolvedAmount))
  const maxLivingEnemies = Math.max(
    1,
    Math.floor(move.summon?.maxLivingEnemies ?? DEFAULT_SUMMON_LIVING_ENEMY_LIMIT),
  )
  const livingEnemyCountBefore = state.enemies.filter((candidate) => candidate.currentForm > 0).length

  if (!summonDefinitionId || !summonDefinition) {
    return {
      state,
      payload: {
        summonResult: 'missing_definition',
        summonEnemyDefinitionId: summonDefinitionId ?? null,
        requestedCount,
        livingEnemyCountBefore,
        maxLivingEnemies,
      },
    }
  }

  const availableSlots = Math.max(0, maxLivingEnemies - livingEnemyCountBefore)
  const summonCount = Math.min(requestedCount, availableSlots)

  if (summonCount <= 0) {
    return {
      state,
      payload: {
        summonResult: 'blocked_by_limit',
        summonEnemyDefinitionId: summonDefinition.id,
        requestedCount,
        summonCount: 0,
        livingEnemyCountBefore,
        maxLivingEnemies,
      },
    }
  }

  const summonedEnemies = Array.from({ length: summonCount }, (_, index) =>
    createEnemyState(summonDefinition, state.enemies.length + index),
  )

  return {
    state: {
      ...state,
      enemies: [...state.enemies, ...summonedEnemies],
    },
    payload: {
      summonResult: 'summoned',
      summonEnemyDefinitionId: summonDefinition.id,
      summonedEnemyInstanceIds: summonedEnemies.map((enemy) => enemy.instanceId),
      requestedCount,
      summonCount,
      livingEnemyCountBefore,
      livingEnemyCountAfter: livingEnemyCountBefore + summonCount,
      maxLivingEnemies,
    },
  }
}

function executeCustomMove(
  state: CombatState,
  enemy: EnemyState,
  move: AbnormalMoveDefinition,
): {
  readonly state: CombatState
  readonly payload: Record<string, JsonValue>
} {
  if (!move.doomBargain) {
    return {
      state,
      payload: {
        customResult: 'no_effect',
      },
    }
  }

  const doomAmount = Math.max(0, Math.floor(move.doomBargain.doomAmount ?? move.amount ?? 0))
  const incenseAmount = Math.max(0, Math.floor(move.doomBargain.incenseAmount ?? 0))
  const nextTurnIncenseBonusAdded = Math.max(
    0,
    Math.floor(move.doomBargain.nextTurnIncenseBonus ?? 0),
  )
  let nextState = state
  let currentDoom = state.resources.doom
  let currentIncense = state.player.incense

  if (incenseAmount > 0) {
    currentIncense += incenseAmount
    nextState = appendLog(
      {
        ...nextState,
        player: {
          ...nextState.player,
          incense: currentIncense,
        },
      },
      {
        type: 'INCENSE_GAINED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          amount: incenseAmount,
          currentIncense,
          reason: 'doom_bargain',
        },
      },
    )
  }

  if (nextTurnIncenseBonusAdded > 0) {
    nextState = {
      ...nextState,
      nextTurnIncenseBonus: nextState.nextTurnIncenseBonus + nextTurnIncenseBonusAdded,
    }
  }

  if (doomAmount > 0) {
    const resources = applyTutorialResourceDelta(nextState.resources, {
      doom: doomAmount,
    })
    currentDoom = resources.doom
    nextState = appendLog(
      {
        ...nextState,
        resources,
      },
      {
        type: 'DOOM_GAINED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          amount: doomAmount,
          currentDoom,
          reason: 'doom_bargain',
        },
      },
    )
  }

  return {
    state: nextState,
    payload: {
      customResult: 'doom_bargain',
      doomAmount,
      currentDoom,
      incenseAmount,
      currentIncense,
      nextTurnIncenseBonusAdded,
      nextTurnIncenseBonus: nextState.nextTurnIncenseBonus,
    },
  }
}

function getResolvedMoveAmount(
  state: CombatState,
  enemy: EnemyState,
  intentId: string,
  move: AbnormalMoveDefinition,
) {
  const isFirstUse = !hasExecutedMoveBefore(state, enemy, intentId, move)

  return {
    amount: isFirstUse ? (move.firstUseAmount ?? move.amount ?? 1) : (move.amount ?? 1),
    isFirstUse,
  }
}

function hasExecutedMoveBefore(
  state: CombatState,
  enemy: EnemyState,
  intentId: string,
  move: AbnormalMoveDefinition,
) {
  return state.actionLog.some(
    (entry) =>
      entry.type === 'ABNORMAL_MOVE_EXECUTED' &&
      entry.sourceId === enemy.instanceId &&
      entry.payload.intentId === intentId &&
      entry.payload.moveType === move.type,
  )
}

function createFouledScrollCards(
  state: CombatState,
  count: number,
): readonly CardInstance[] {
  return Array.from({ length: count }, (_, index) => ({
    instanceId: `temporary_card_instance_${state.turn}_${state.actionLog.length}_${index + 1}_${FOULED_SCROLL_CARD_ID}`,
    definitionId: FOULED_SCROLL_CARD_ID,
    owner: 'player',
    isTemporary: true,
    annotations: [],
  }))
}

function getResolvedFouledScrollDestination(
  move: AbnormalMoveDefinition,
  isFirstUse: boolean,
): FouledScrollDestination {
  if (isFirstUse && move.firstUseDestination) {
    return move.firstUseDestination
  }

  return move.destination ?? DEFAULT_FOULED_SCROLL_DESTINATION
}

function addFouledScrollCardsToDestination(
  state: CombatState,
  addedCards: readonly CardInstance[],
  destination: FouledScrollDestination,
): CombatState {
  if (destination === 'draw_pile_top') {
    return {
      ...state,
      drawPile: [...addedCards, ...state.drawPile],
    }
  }

  if (destination === 'draw_pile') {
    return {
      ...state,
      drawPile: [...state.drawPile, ...addedCards],
    }
  }

  return {
    ...state,
    discardPile: [...state.discardPile, ...addedCards],
  }
}

function disruptMostRecentAltar(
  state: CombatState,
  enemy: EnemyState,
): {
  readonly state: CombatState
  readonly disruptedAltarId: string | null
  readonly disruptedAltarSlot: string | null
} {
  const altar = state.altars[state.altars.length - 1]

  if (!altar) {
    return {
      state,
      disruptedAltarId: null,
      disruptedAltarSlot: null,
    }
  }

  const nextState: CombatState = {
    ...state,
    altars: state.altars.filter((candidate) => candidate.id !== altar.id),
  }

  return {
    state: appendLog(nextState, {
      type: 'ALTAR_EXPIRED',
      sourceId: altar.id,
      targetId: altar.targetEnemyInstanceId,
      payload: {
        slot: altar.slot,
        reason: 'disrupted_by_abnormal_move',
        disruptedByEnemyInstanceId: enemy.instanceId,
      },
    }),
    disruptedAltarId: altar.id,
    disruptedAltarSlot: altar.slot,
  }
}

function coverOneRevealedNameSlot(
  state: CombatState,
  enemy: EnemyState,
): {
  readonly state: CombatState
  readonly coveredSlotIndex: number | null
  readonly result: 'covered' | 'enemy_named' | 'no_revealed_name' | 'no_target'
} {
  const currentEnemy = state.enemies.find((candidate) => candidate.instanceId === enemy.instanceId)

  if (!currentEnemy) {
    return {
      state,
      coveredSlotIndex: null,
      result: 'no_target',
    }
  }

  if (currentEnemy.isNamed) {
    return {
      state,
      coveredSlotIndex: null,
      result: 'enemy_named',
    }
  }

  const revealedSlot = currentEnemy.nameSlots
    .slice()
    .reverse()
    .find((slot) => slot.isRevealed)

  if (!revealedSlot) {
    return {
      state,
      coveredSlotIndex: null,
      result: 'no_revealed_name',
    }
  }

  return {
    state: {
      ...state,
      enemies: state.enemies.map((candidate) =>
        candidate.instanceId === currentEnemy.instanceId
          ? {
              ...candidate,
              coveredNameSlotIndices: candidate.coveredNameSlotIndices.includes(
                revealedSlot.index,
              )
                ? candidate.coveredNameSlotIndices
                : [...candidate.coveredNameSlotIndices, revealedSlot.index],
              nameSlots: candidate.nameSlots.map((slot) =>
                slot.index === revealedSlot.index
                  ? {
                      ...slot,
                      isRevealed: false,
                    }
                  : slot,
              ),
            }
          : candidate,
      ),
    },
    coveredSlotIndex: revealedSlot.index,
    result: 'covered',
  }
}

function selectHealFormTarget(
  state: CombatState,
  enemy: EnemyState,
  targetMode: HealFormTarget,
): EnemyState {
  const currentEnemy = state.enemies.find((candidate) => candidate.instanceId === enemy.instanceId)

  if (targetMode === 'self' || !currentEnemy) {
    return currentEnemy ?? enemy
  }

  const woundedAlly = state.enemies
    .filter(
      (candidate) =>
        candidate.instanceId !== enemy.instanceId &&
        candidate.currentForm > 0 &&
        candidate.currentForm < candidate.maxForm,
    )
    .sort((first, second) => {
      const firstRatio = first.currentForm / first.maxForm
      const secondRatio = second.currentForm / second.maxForm

      return firstRatio - secondRatio
    })[0]

  return woundedAlly ?? currentEnemy
}

interface AdvanceEnemyIntentOptions {
  readonly forceMaskCurrentIntent?: boolean
}

function advanceEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  enemyDefinitions: readonly EnemyDefinition[],
  options: AdvanceEnemyIntentOptions = {},
): CombatState {
  const definition = enemyDefinitions.find((candidate) => candidate.id === enemy.definitionId)
  const currentEnemy = getCurrentEnemyState(state, enemy)

  if (!definition || definition.intents.length === 0) {
    return state
  }

  const nextIntentIndex =
    getNamedPhaseCounterIntentIndex(state, definition, currentEnemy) ??
    ((currentEnemy.intentIndex + 1) % definition.intents.length)
  const nextIntent = definition.intents[nextIntentIndex]
  const followingIntent = definition.intents[(nextIntentIndex + 1) % definition.intents.length]
  const enemies = state.enemies.map((candidate) =>
    candidate.instanceId === enemy.instanceId
      ? advanceSingleEnemyIntent(
          state,
          candidate,
          nextIntentIndex,
          nextIntent,
          followingIntent,
          options,
        )
      : candidate,
  )

  return {
    ...state,
    enemies,
  }
}

function getNamedPhaseCounterIntentIndex(
  state: CombatState,
  definition: EnemyDefinition,
  enemy: EnemyState,
): number | undefined {
  const namedPhase = enemy.namedPhase
  const counterIntentId = namedPhase?.isActive ? namedPhase.counterIntentId : undefined

  if (!namedPhase?.isActive || !counterIntentId) {
    return undefined
  }

  const counterIntentIndex = definition.intents.findIndex(
    (intent) => intent.id === counterIntentId,
  )

  if (counterIntentIndex < 0) {
    return undefined
  }

  if (enemy.currentIntent?.id !== counterIntentId) {
    return counterIntentIndex
  }

  const sequentialIntent = definition.intents[(enemy.intentIndex + 1) % definition.intents.length]

  return hasNamedPhaseAdjustedMove(state, sequentialIntent, enemy)
    ? counterIntentIndex
    : undefined
}

function hasNamedPhaseAdjustedMove(
  state: CombatState,
  intent: EnemyIntentDefinition | undefined,
  enemy: EnemyState,
) {
  return Boolean(
    intent?.effects.some(
      (effect) =>
        effect.type === 'ABNORMAL_MOVE' &&
        Boolean(getNamedPhaseMoveAdjustment(state, enemy, effect.move.type)),
    ),
  )
}

function advanceSingleEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  nextIntentIndex: number,
  nextIntent: EnemyIntentDefinition | undefined,
  followingIntent: EnemyIntentDefinition | undefined,
  options: AdvanceEnemyIntentOptions,
): EnemyState {
  const nextMaskMode = enemy.intentMaskMode === 'current_only' ? 'none' : enemy.intentMaskMode
  const hasPreviewedNextIntent =
    Boolean(nextIntent) && enemy.nextIntentPreview?.id === nextIntent?.id
  const isNextIntentRevealed =
    !options.forceMaskCurrentIntent && (hasPreviewedNextIntent || nextMaskMode === 'none')

  return {
    ...enemy,
    intentIndex: nextIntentIndex,
    currentIntent: nextIntent,
    currentIntentVisibility: isNextIntentRevealed ? 'revealed' : 'masked',
    intentMaskMode: nextMaskMode,
    nextIntent: followingIntent,
    nextIntentPreview: undefined,
    incomingForce: resolveIncomingForceAmount(state, enemy, nextIntent).amount,
    blockedAbnormalMoveTypes: [],
  }
}

function getCurrentEnemyState(state: CombatState, enemy: EnemyState): EnemyState {
  return state.enemies.find((candidate) => candidate.instanceId === enemy.instanceId) ?? enemy
}
