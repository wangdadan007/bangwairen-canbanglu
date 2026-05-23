import { describe, expect, it } from 'vitest'
import { createInitialBattleState, reduceBattleState, type BattleReducerContext } from '../core'
import { gameData } from '../data'
import type { CardId, CombatState, EnemyDefinition, EnemyId } from '../types'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T07 incoming force, sealing, and abnormal moves', () => {
  it('lets seal-force cards reduce only the current incoming force', () => {
    const state = createBattle('enemy_paper_wraith', ['card_guard_desk_talisman'])

    expect(state.enemies[0].incomingForce).toBe(5)

    const afterSeal = playFirstCard(state, 'card_guard_desk_talisman')

    expect(afterSeal.enemies[0].incomingForce).toBe(2)
    expect(lastLogOfType(afterSeal, 'INCOMING_FORCE_SEALED')?.payload).toEqual(
      expect.objectContaining({
        amount: 3,
        remainingIncomingForce: 2,
      }),
    )

    const nextTurn = reduceBattleState(afterSeal, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'INCOMING_FORCE_CREATED')?.payload).toEqual(
      expect.objectContaining({
        amount: 2,
        baseAmount: 5,
      }),
    )
    expect(nextTurn.enemies[0].incomingForce).toBe(5)
  })

  it('executes steal-incense as an abnormal move that seal-force cannot reduce', () => {
    const state = createBattle('enemy_incense_thief_mouse', ['card_guard_desk_talisman'])

    expect(state.enemies[0].currentIntent?.kind).toBe('abnormal_move')
    expect(state.enemies[0].incomingForce).toBe(0)

    const afterSeal = playFirstCard(state, 'card_guard_desk_talisman')

    expect(afterSeal.enemies[0].incomingForce).toBe(0)
    expect(lastLogOfType(afterSeal, 'INCOMING_FORCE_SEALED')?.payload).toEqual(
      expect.objectContaining({
        amount: 0,
        remainingIncomingForce: 0,
      }),
    )

    const nextTurn = reduceBattleState(afterSeal, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        nextTurnIncensePenalty: 1,
      }),
    )
    expect(nextTurn.player.incense).toBe(2)
    expect(nextTurn.nextTurnIncensePenalty).toBe(0)
  })

  it('lets a dedicated counter prevent the abnormal move', () => {
    const state = createBattle('enemy_incense_thief_mouse', ['card_cut_supply_talisman'])
    const afterCounter = playFirstCard(state, 'card_cut_supply_talisman')

    expect(afterCounter.enemies[0].blockedAbnormalMoveTypes).toContain('steal_incense')
    expect(lastLogOfType(afterCounter, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        result: 'prepared',
      }),
    )

    const nextTurn = reduceBattleState(afterCounter, { type: 'END_TURN' }, context)

    expect(nextTurn.actionLog.some((entry) => entry.type === 'ABNORMAL_MOVE_EXECUTED')).toBe(false)
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        result: 'prevented',
      }),
    )
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.enemies[0].blockedAbnormalMoveTypes).toHaveLength(0)
  })

  it('keeps plague-paper fouled scrolls slow by placing them in the discard pile', () => {
    const state = createBattle('enemy_plague_paper_figure')
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'add_fouled_scroll',
        addedCardDefinitionId: 'card_fouled_scroll',
        addedCardCount: 1,
        destination: 'discard_pile',
      }),
    )
    expect(nextTurn.discardPile.map((card) => card.definitionId)).toContain('card_fouled_scroll')
    expect(nextTurn.hand.map((card) => card.definitionId)).not.toContain('card_fouled_scroll')
  })

  it('lets scroll-stuffer pressure place its first fouled scroll on top of the draw pile', () => {
    const state = createBattle('enemy_scroll_stuffer_clerk')
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'add_fouled_scroll',
        addedCardDefinitionId: 'card_fouled_scroll',
        addedCardCount: 1,
        destination: 'draw_pile_top',
      }),
    )
    expect(nextTurn.hand[0]?.definitionId).toBe('card_fouled_scroll')
  })

  it('executes cover-name pressure without undoing a fully named enemy', () => {
    const state = createBattle('enemy_fleeing_name_paper_horse', ['card_ask_name'])
    const afterAsk = playFirstCard(state, 'card_ask_name')
    const nextTurn = reduceBattleState(afterAsk, { type: 'END_TURN' }, context)

    expect(afterAsk.enemies[0].nameSlots.some((slot) => slot.isRevealed)).toBe(true)
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        coveredSlotIndex: 0,
      }),
    )
    expect(nextTurn.enemies[0].nameSlots.every((slot) => !slot.isRevealed)).toBe(true)
  })

  it('turns fleeing-name cover pressure into small form pressure when no name is revealed', () => {
    const state = createBattle('enemy_fleeing_name_paper_horse', ['card_guard_desk_talisman'])
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        coverNameResult: 'no_revealed_name',
        fallbackIncomingForceApplied: 2,
      }),
    )
    expect(nextTurn.player.currentForm).toBe(state.player.currentForm - 2)
  })

  it('executes support recovery as a low-cost support pressure', () => {
    const state = withEnemyCurrentForm(
      createBattle('enemy_offering_table_afterimage', ['card_guard_desk_talisman']),
      8,
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'heal_form',
        healedAmount: 4,
        currentForm: 12,
      }),
    )
    expect(nextTurn.enemies[0].currentForm).toBe(12)
  })

  it('lets offering-table support heal the most wounded ally before itself', () => {
    const state = withEnemyCurrentForms(
      createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinitions: [
          getEnemy('enemy_paper_wraith'),
          getEnemy('enemy_offering_table_afterimage'),
        ],
        deckDefinitionIds: ['card_guard_desk_talisman'],
      }),
      {
        enemy_paper_wraith: 10,
        enemy_offering_table_afterimage: 8,
      },
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'heal_form',
        targetEnemyInstanceId: state.enemies[0].instanceId,
        healedAmount: 4,
        currentForm: 14,
      }),
    )
    expect(nextTurn.enemies[0].currentForm).toBe(14)
    expect(nextTurn.enemies[1].currentForm).toBe(8)
  })

  it('makes the incense clerk first steal stronger than later repeats', () => {
    let state = createBattleAtIntent(
      'enemy_incense_clerk',
      'intent_incense_clerk_audit_offering',
    )

    state = reduceBattleState(state, { type: 'END_TURN' }, context)
    state = reduceBattleState(state, { type: 'END_TURN' }, context)
    state = reduceBattleState(state, { type: 'END_TURN' }, context)
    state = reduceBattleState(state, { type: 'END_TURN' }, context)

    const stealLogs = state.actionLog.filter(
      (entry) =>
        entry.type === 'ABNORMAL_MOVE_EXECUTED' &&
        entry.payload.moveType === 'steal_incense',
    )

    expect(stealLogs.map((entry) => entry.payload.amount)).toEqual([2, 1])
  })

  it('keeps fire fleeing name from undoing a named enemy and converts it into form pressure', () => {
    const state = withEnemyNamed(
      createBattleAtIntent(
        'enemy_fire_fleeing_name',
        'intent_fire_fleeing_name_burn_name',
      ),
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        coverNameResult: 'enemy_named',
        fallbackIncomingForceApplied: 2,
      }),
    )
    expect(nextTurn.enemies[0].isNamed).toBe(true)
    expect(nextTurn.player.currentForm).toBe(state.player.currentForm - 2)
  })

  it('lets the dipper empty shell disrupt a prepared altar before falling back to cover name', () => {
    const state = createBattleAtIntent(
      'enemy_dipper_empty_shell',
      'intent_dipper_empty_shell_blank_name',
      ['card_heaven_altar_oracle'],
    )
    const altarCard = getHandCard(state, 'card_heaven_altar_oracle')
    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: altarCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const nextTurn = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ALTAR_EXPIRED')?.payload).toEqual(
      expect.objectContaining({
        slot: 'heaven',
        reason: 'disrupted_by_abnormal_move',
      }),
    )
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        disruptedAltarSlot: 'heaven',
      }),
    )
    expect(nextTurn.altars).toHaveLength(0)
  })

  it('lets the unlit temple warden summon a nameless paper imp into normal targeting', () => {
    const state = createBattleAtIntent(
      'enemy_unlit_temple_warden',
      'intent_unlit_temple_warden_call_paper_imp',
      ['card_zhu_fu', 'card_zhu_fu', 'card_zhu_fu', 'card_zhu_fu', 'card_zhu_fu', 'card_zhu_fu'],
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)
    const summonedEnemy = nextTurn.enemies.find(
      (enemy) => enemy.definitionId === 'enemy_nameless_paper_imp',
    )

    expect(summonedEnemy).toBeDefined()
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'summon',
        summonResult: 'summoned',
        summonEnemyDefinitionId: 'enemy_nameless_paper_imp',
        summonCount: 1,
      }),
    )

    const breakCard = getHandCard(nextTurn, 'card_zhu_fu')
    const afterBreak = reduceBattleState(
      nextTurn,
      {
        type: 'PLAY_CARD',
        cardInstanceId: breakCard.instanceId,
        targetEnemyInstanceId: summonedEnemy!.instanceId,
      },
      context,
    )
    const damagedSummon = afterBreak.enemies.find(
      (enemy) => enemy.instanceId === summonedEnemy!.instanceId,
    )

    expect(damagedSummon?.currentForm).toBe(6)
  })

  it('lets earth altar counter the unlit temple warden summon', () => {
    const state = createBattleAtIntent(
      'enemy_unlit_temple_warden',
      'intent_unlit_temple_warden_call_paper_imp',
      ['card_earth_altar_watch'],
    )
    const earthAltarCard = getHandCard(state, 'card_earth_altar_watch')
    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: earthAltarCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const nextTurn = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(nextTurn.enemies.map((enemy) => enemy.definitionId)).not.toContain(
      'enemy_nameless_paper_imp',
    )
    expect(nextTurn.actionLog.filter((entry) => entry.type === 'ABNORMAL_MOVE_COUNTERED').map(
      (entry) => entry.payload,
    )).toEqual([
      expect.objectContaining({
        moveType: 'summon',
        result: 'prepared',
      }),
      expect.objectContaining({
        moveType: 'summon',
        result: 'prevented',
      }),
    ])
  })

  it('prevents repeated low-cost summons when the living enemy limit is already full', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinitions: [
        getEnemy('enemy_unlit_temple_warden'),
        getEnemy('enemy_nameless_paper_imp'),
      ],
      deckDefinitionIds: ['card_guard_desk_talisman'],
      initialEnemyIntentIds: {
        enemy_unlit_temple_warden: 'intent_unlit_temple_warden_call_paper_imp',
      },
    })
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(nextTurn.enemies).toHaveLength(2)
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'summon',
        summonResult: 'blocked_by_limit',
        summonCount: 0,
        maxLivingEnemies: 2,
      }),
    )
  })

  it('lets the fortune breaker trade next-turn incense for doom', () => {
    const state = createBattleAtIntent(
      'enemy_fortune_breaker',
      'intent_fortune_breaker_reverse_lot_debt',
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(nextTurn.resources.doom).toBe(1)
    expect(nextTurn.player.incense).toBe(4)
    expect(lastLogOfType(nextTurn, 'DOOM_GAINED')?.payload).toEqual(
      expect.objectContaining({
        amount: 1,
        currentDoom: 1,
        reason: 'doom_bargain',
      }),
    )
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'custom',
        customResult: 'doom_bargain',
        doomAmount: 1,
        nextTurnIncenseBonusAdded: 1,
      }),
    )
  })

  it('lets earth altar counter the fortune breaker doom bargain before it adds doom', () => {
    const state = createBattleAtIntent(
      'enemy_fortune_breaker',
      'intent_fortune_breaker_reverse_lot_debt',
      ['card_earth_altar_watch'],
    )
    const earthAltarCard = getHandCard(state, 'card_earth_altar_watch')
    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: earthAltarCard.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const nextTurn = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(nextTurn.resources.doom).toBe(0)
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.actionLog.some((entry) => entry.type === 'DOOM_GAINED')).toBe(false)
    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'custom',
        result: 'prevented',
      }),
    )
  })
})

function createBattle(enemyDefinitionId: EnemyId, deckDefinitionIds?: readonly CardId[]) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: getEnemy(enemyDefinitionId),
    deckDefinitionIds,
  })
}

function createBattleAtIntent(
  enemyDefinitionId: EnemyId,
  intentId: string,
  deckDefinitionIds?: readonly CardId[],
) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: getEnemy(enemyDefinitionId),
    deckDefinitionIds,
    initialEnemyIntentIds: {
      [enemyDefinitionId]: intentId,
    },
  })
}

function playFirstCard(state: CombatState, definitionId: CardId) {
  const card = getHandCard(state, definitionId)

  return reduceBattleState(
    state,
    {
      type: 'PLAY_CARD',
      cardInstanceId: card.instanceId,
      targetEnemyInstanceId: state.enemies[0].instanceId,
    },
    context,
  )
}

function getHandCard(state: CombatState, definitionId: CardId) {
  const card = state.hand.find((candidate) => candidate.definitionId === definitionId)

  if (!card) {
    throw new Error(`Expected card in hand: ${definitionId}`)
  }

  return card
}

function getEnemy(definitionId: EnemyId): EnemyDefinition {
  const enemy = gameData.enemies.find((candidate) => candidate.id === definitionId)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${definitionId}`)
  }

  return enemy
}

function lastLogOfType(state: CombatState, type: CombatState['actionLog'][number]['type']) {
  const entries = state.actionLog.filter((entry) => entry.type === type)

  return entries[entries.length - 1]
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

function withEnemyCurrentForms(
  state: CombatState,
  currentFormsByDefinitionId: Readonly<Record<string, number>>,
): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      currentForm: currentFormsByDefinitionId[enemy.definitionId] ?? enemy.currentForm,
    })),
  }
}

function withEnemyNamed(state: CombatState): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            isNamed: true,
            hasTriggeredNameBreak: true,
            nameSlots: enemy.nameSlots.map((slot) => ({
              ...slot,
              isRevealed: true,
            })),
          }
        : enemy,
    ),
  }
}
