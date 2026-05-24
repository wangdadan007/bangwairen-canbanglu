import { appendLog } from '../log/actionLog'
import { applyTutorialResourceDelta } from '../run/resourceResolver'
import { drawCards } from './drawResolver'
import type {
  AbnormalMoveType,
  CombatState,
  GameEntityId,
  TutorialRegisterRuleId,
} from '../../types'

const COMMON_DOCKET_RULE_ID: TutorialRegisterRuleId = 'register_common_docket'
const INCENSE_CLERK_RULE_ID: TutorialRegisterRuleId = 'register_incense_clerk'
const FIRE_FLEEING_NAME_RULE_ID: TutorialRegisterRuleId = 'register_fire_fleeing_name'
const DIPPER_EMPTY_SHELL_RULE_ID: TutorialRegisterRuleId = 'register_dipper_empty_shell'
const DEFAULT_COMMON_DOCKET_REMAINING_TRIGGERS = 3

export function triggerRegisterAfterAbnormalMoveCountered(
  state: CombatState,
  input: {
    readonly sourceId: GameEntityId
    readonly targetId?: GameEntityId
    readonly moveType?: AbnormalMoveType | string
  },
): CombatState {
  if (
    !hasRegisterRule(state, INCENSE_CLERK_RULE_ID) ||
    hasTriggeredRegisterRule(state, INCENSE_CLERK_RULE_ID, 'counter_abnormal')
  ) {
    return state
  }

  let nextState = gainInkFromRegisterRule(state, INCENSE_CLERK_RULE_ID, input.sourceId, 1)
  const incenseAmount = input.moveType === 'steal_incense' ? 1 : 0

  if (incenseAmount > 0) {
    nextState = gainIncenseFromRegisterRule(
      nextState,
      INCENSE_CLERK_RULE_ID,
      input.sourceId,
      incenseAmount,
    )
  }

  return appendRegisterTriggerLog(nextState, {
    ruleId: INCENSE_CLERK_RULE_ID,
    trigger: 'counter_abnormal',
    sourceId: input.sourceId,
    targetId: input.targetId,
    payload: {
      moveType: input.moveType ?? null,
      inkDelta: 1,
      incenseDelta: incenseAmount,
    },
  })
}

export function triggerRegisterAfterEnemyNamed(
  state: CombatState,
  input: {
    readonly sourceId: GameEntityId
    readonly targetId?: GameEntityId
  },
): CombatState {
  let nextState = state

  const commonDocketEntry = getRegisterEntry(nextState, COMMON_DOCKET_RULE_ID)
  const commonDocketRemainingTriggers = getRemainingTriggerCount(commonDocketEntry)

  if (
    commonDocketEntry &&
    commonDocketRemainingTriggers > 0 &&
    !hasTriggeredRegisterRule(nextState, COMMON_DOCKET_RULE_ID, 'enemy_named')
  ) {
    const nextRemainingTriggerCount = commonDocketRemainingTriggers - 1
    nextState = updateRegisterEntryRemainingTriggers(
      nextState,
      commonDocketEntry.id,
      nextRemainingTriggerCount,
    )
    nextState = gainInkFromRegisterRule(nextState, COMMON_DOCKET_RULE_ID, input.sourceId, 1)
    nextState = appendRegisterTriggerLog(nextState, {
      ruleId: COMMON_DOCKET_RULE_ID,
      trigger: 'enemy_named',
      sourceId: input.sourceId,
      targetId: input.targetId,
      payload: {
        inkDelta: 1,
        remainingTriggerCount: nextRemainingTriggerCount,
      },
    })
  }

  if (
    hasRegisterRule(nextState, FIRE_FLEEING_NAME_RULE_ID) &&
    !hasTriggeredRegisterRule(nextState, FIRE_FLEEING_NAME_RULE_ID, 'enemy_named')
  ) {
    nextState = {
      ...nextState,
      pendingRegisterBreakShapeBonus: {
        ruleId: FIRE_FLEEING_NAME_RULE_ID,
        amount: 3,
        expiresTurn: nextState.turn,
      },
    }

    nextState = appendRegisterTriggerLog(nextState, {
      ruleId: FIRE_FLEEING_NAME_RULE_ID,
      trigger: 'enemy_named',
      sourceId: input.sourceId,
      targetId: input.targetId,
      payload: {
        pendingBreakShapeBonus: 3,
        expiresTurn: nextState.turn,
      },
    })
  }

  return nextState
}

export function consumePendingRegisterBreakShapeBonus(
  state: CombatState,
  targetId?: GameEntityId,
): {
  readonly state: CombatState
  readonly bonusAmount: number
} {
  const bonus = state.pendingRegisterBreakShapeBonus

  if (!bonus) {
    return {
      state,
      bonusAmount: 0,
    }
  }

  const clearedState: CombatState = {
    ...state,
    pendingRegisterBreakShapeBonus: undefined,
  }

  if (bonus.expiresTurn !== state.turn) {
    return {
      state: clearedState,
      bonusAmount: 0,
    }
  }

  return {
    state: appendRegisterTriggerLog(clearedState, {
      ruleId: bonus.ruleId,
      trigger: 'break_bonus_consumed',
      sourceId: bonus.ruleId,
      targetId,
      payload: {
        breakShapeBonus: bonus.amount,
      },
    }),
    bonusAmount: bonus.amount,
  }
}

export function triggerRegisterAfterAltarPlaced(
  state: CombatState,
  input: {
    readonly sourceId: GameEntityId
    readonly targetId?: GameEntityId
  },
): CombatState {
  if (
    !hasRegisterRule(state, DIPPER_EMPTY_SHELL_RULE_ID) ||
    hasTriggeredRegisterRule(state, DIPPER_EMPTY_SHELL_RULE_ID, 'altar_placed')
  ) {
    return state
  }

  const nextState = gainInkFromRegisterRule(state, DIPPER_EMPTY_SHELL_RULE_ID, input.sourceId, 1)

  return appendRegisterTriggerLog(nextState, {
    ruleId: DIPPER_EMPTY_SHELL_RULE_ID,
    trigger: 'altar_placed',
    sourceId: input.sourceId,
    targetId: input.targetId,
    payload: {
      inkDelta: 1,
    },
  })
}

export function triggerRegisterAfterAltarTriggered(
  state: CombatState,
  input: {
    readonly sourceId: GameEntityId
    readonly targetId?: GameEntityId
  },
): CombatState {
  if (
    !hasRegisterRule(state, DIPPER_EMPTY_SHELL_RULE_ID) ||
    hasTriggeredRegisterRule(state, DIPPER_EMPTY_SHELL_RULE_ID, 'altar_triggered')
  ) {
    return state
  }

  const nextState = drawCards(state, 1)

  return appendRegisterTriggerLog(nextState, {
    ruleId: DIPPER_EMPTY_SHELL_RULE_ID,
    trigger: 'altar_triggered',
    sourceId: input.sourceId,
    targetId: input.targetId,
    payload: {
      drawCount: 1,
    },
  })
}

function hasRegisterRule(state: CombatState, ruleId: TutorialRegisterRuleId) {
  return state.registerEntries.some((entry) => entry.registerRuleId === ruleId)
}

function getRegisterEntry(state: CombatState, ruleId: TutorialRegisterRuleId) {
  return state.registerEntries.find((entry) => entry.registerRuleId === ruleId)
}

function getRemainingTriggerCount(entry: CombatState['registerEntries'][number] | undefined) {
  if (!entry) {
    return 0
  }

  return entry.remainingTriggerCount ?? entry.maxTriggerCount ?? DEFAULT_COMMON_DOCKET_REMAINING_TRIGGERS
}

function updateRegisterEntryRemainingTriggers(
  state: CombatState,
  entryId: string,
  remainingTriggerCount: number,
): CombatState {
  return {
    ...state,
    registerEntries: state.registerEntries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            remainingTriggerCount,
          }
        : entry,
    ),
  }
}

function hasTriggeredRegisterRule(
  state: CombatState,
  ruleId: TutorialRegisterRuleId,
  trigger: string,
) {
  return state.actionLog.some(
    (entry) =>
      entry.type === 'REGISTER_RULE_TRIGGERED' &&
      entry.payload.ruleId === ruleId &&
      entry.payload.trigger === trigger,
  )
}

function gainInkFromRegisterRule(
  state: CombatState,
  ruleId: TutorialRegisterRuleId,
  sourceId: GameEntityId,
  amount: number,
): CombatState {
  const resources = applyTutorialResourceDelta(state.resources, {
    ink: amount,
  })
  const nextState: CombatState = {
    ...state,
    resources,
  }

  return appendLog(nextState, {
    type: 'INK_GAINED',
    sourceId,
    targetId: 'player',
    payload: {
      amount,
      currentInk: resources.ink,
      registerRuleId: ruleId,
    },
  })
}

function gainIncenseFromRegisterRule(
  state: CombatState,
  ruleId: TutorialRegisterRuleId,
  sourceId: GameEntityId,
  amount: number,
): CombatState {
  if (state.phase === 'player_turn') {
    const nextState: CombatState = {
      ...state,
      player: {
        ...state.player,
        incense: state.player.incense + amount,
      },
    }

    return appendLog(nextState, {
      type: 'INCENSE_GAINED',
      sourceId,
      targetId: 'player',
      payload: {
        amount,
        currentIncense: nextState.player.incense,
        registerRuleId: ruleId,
      },
    })
  }

  const nextState: CombatState = {
    ...state,
    nextTurnIncenseBonus: state.nextTurnIncenseBonus + amount,
  }

  return appendLog(nextState, {
    type: 'INCENSE_GAINED',
    sourceId,
    targetId: 'player',
    payload: {
      amount,
      currentIncense: state.player.incense,
      nextTurnIncenseBonus: nextState.nextTurnIncenseBonus,
      registerRuleId: ruleId,
    },
  })
}

function appendRegisterTriggerLog(
  state: CombatState,
  input: {
    readonly ruleId: TutorialRegisterRuleId
    readonly trigger: string
    readonly sourceId: GameEntityId
    readonly targetId?: GameEntityId
    readonly payload?: Record<string, unknown>
  },
) {
  return appendLog(state, {
    type: 'REGISTER_RULE_TRIGGERED',
    sourceId: input.sourceId,
    targetId: input.targetId,
    payload: {
      ruleId: input.ruleId,
      trigger: input.trigger,
      ...input.payload,
    },
  })
}
