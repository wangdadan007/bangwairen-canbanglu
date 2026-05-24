import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  reduceBattleState,
  type BattleReducerContext,
  type OpeningRiskLogRecord,
} from '../core'
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

  it('defines named-phase data for every currently nameable enemy', () => {
    const nameableEnemies = gameData.enemies.filter((enemy) => enemy.nameSlots > 0)

    expect(nameableEnemies).toHaveLength(13)
    expect(nameableEnemies.every((enemy) => (enemy.onNamed?.length ?? 0) > 0)).toBe(true)
  })

  it('activates named phase and blocks fleeing-name cover after naming', () => {
    const state = createBattleAtIntent(
      'enemy_fleeing_name_paper_horse',
      'intent_fleeing_name_paper_horse_hide_trace',
      ['card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const namedPhaseLog = lastLogOfType(afterNamed, 'NAMED_PHASE_TRIGGERED')

    expect(afterNamed.enemies[0].isNamed).toBe(true)
    expect(afterNamed.enemies[0].namedPhase?.isActive).toBe(true)
    expect(namedPhaseLog?.payload).toEqual(
      expect.objectContaining({
        disabledMoveTypes: ['cover_name'],
        counterIntentId: 'intent_fleeing_name_paper_horse_kick_dust',
      }),
    )

    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        result: 'prevented_by_named_phase',
      }),
    )
    expect(nextTurn.enemies[0].nameSlots.every((slot) => slot.isRevealed)).toBe(true)
    expect(nextTurn.player.currentForm).toBe(afterNamed.player.currentForm)
  })

  it('downgrades tutorial mouse stealing after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_incense_thief_mouse',
      'intent_incense_thief_mouse_steal',
      ['card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        amount: 0,
        namedPhaseResult: 'downgraded',
      }),
    )
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_incense_thief_mouse_bite')
  })

  it('keeps paper wraith and bronze patrol named phases as clear counter-intent handoffs', () => {
    const paperState = nameFirstEnemy(
      createBattleAtIntent('enemy_paper_wraith', 'intent_paper_wraith_scrape', [
        'card_ask_name',
        'card_ask_name',
      ]),
    )
    const bronzeState = nameFirstEnemy(
      createBattleAtIntent('enemy_bronze_bell_patrol', 'intent_bronze_bell_patrol_sweep', [
        'card_ask_name',
        'card_ask_name',
      ]),
    )

    expect(lastLogOfType(paperState, 'NAMED_PHASE_TRIGGERED')?.payload).toEqual(
      expect.objectContaining({
        disabledMoveTypes: [],
        downgradedMoveTypes: [],
        counterIntentId: 'intent_paper_wraith_scrape',
      }),
    )
    expect(lastLogOfType(bronzeState, 'NAMED_PHASE_TRIGGERED')?.payload).toEqual(
      expect.objectContaining({
        disabledMoveTypes: [],
        downgradedMoveTypes: [],
        counterIntentId: 'intent_bronze_bell_patrol_toll',
      }),
    )
  })

  it.each([
    {
      enemyDefinitionId: 'enemy_unlit_temple_warden',
      intentId: 'intent_unlit_temple_warden_call_paper_imp',
      deckDefinitionIds: ['card_ask_name', 'card_ask_name'],
      moveType: 'summon',
      counterIntentId: 'intent_unlit_temple_warden_ring_table',
    },
    {
      enemyDefinitionId: 'enemy_fortune_breaker',
      intentId: 'intent_fortune_breaker_reverse_lot_debt',
      deckDefinitionIds: ['card_ask_name', 'card_ask_name'],
      moveType: 'custom',
      counterIntentId: 'intent_fortune_breaker_crack_lot',
    },
    {
      enemyDefinitionId: 'enemy_plague_paper_figure',
      intentId: 'intent_plague_paper_figure_stain_scroll',
      deckDefinitionIds: ['card_ask_name', 'card_ask_name'],
      moveType: 'add_fouled_scroll',
      counterIntentId: 'intent_plague_paper_figure_cough_ash',
    },
  ])(
    'blocks $moveType pressure after naming $enemyDefinitionId',
    ({ enemyDefinitionId, intentId, deckDefinitionIds, moveType, counterIntentId }) => {
      const state = createBattleAtIntent(enemyDefinitionId, intentId, deckDefinitionIds)
      const afterNamed = nameFirstEnemy(state)
      const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

      expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
        expect.objectContaining({
          moveType,
          result: 'prevented_by_named_phase',
        }),
      )
      expect(nextTurn.enemies[0].currentIntent?.id).toBe(counterIntentId)
    },
  )

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

  it('blocks fire fleeing-name burn after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_fire_fleeing_name',
      'intent_fire_fleeing_name_burn_name',
      ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        result: 'prevented_by_named_phase',
      }),
    )
    expect(nextTurn.enemies[0].isNamed).toBe(true)
    expect(nextTurn.player.currentForm).toBe(afterNamed.player.currentForm)
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

  it('blocks dipper altar disruption after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_dipper_empty_shell',
      'intent_dipper_empty_shell_blank_name',
      ['card_ask_name', 'card_ask_name', 'card_ask_name', 'card_heaven_altar_oracle'],
    )
    const afterNamed = nameFirstEnemy(state)
    const afterIncense = withPlayerIncense(afterNamed, 1)
    const afterAltar = playFirstCard(afterIncense, 'card_heaven_altar_oracle')
    const nextTurn = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        result: 'prevented_by_named_phase',
      }),
    )
    expect(
      nextTurn.actionLog.some(
        (entry) =>
          entry.type === 'ALTAR_EXPIRED' &&
          entry.payload.reason === 'disrupted_by_abnormal_move',
      ),
    ).toBe(false)
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

  it('turns a successful summon into a stronger follow-up incoming force', () => {
    const state = createBattleAtIntent(
      'enemy_unlit_temple_warden',
      'intent_unlit_temple_warden_call_paper_imp',
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)

    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_unlit_temple_warden_ring_table')
    expect(nextTurn.enemies[0].incomingForce).toBe(7)
    expect(nextTurn.enemies.map((enemy) => enemy.definitionId)).toContain(
      'enemy_nameless_paper_imp',
    )
  })

  it('lowers a conditional incoming-force bonus when its support target is cleared', () => {
    const state = createBattleAtIntent(
      'enemy_unlit_temple_warden',
      'intent_unlit_temple_warden_call_paper_imp',
      ['card_heavy_split_form_talisman'],
    )
    const nextTurn = reduceBattleState(state, { type: 'END_TURN' }, context)
    const summonedEnemy = nextTurn.enemies.find(
      (enemy) => enemy.definitionId === 'enemy_nameless_paper_imp',
    )

    expect(nextTurn.enemies[0].incomingForce).toBe(7)
    expect(summonedEnemy).toBeDefined()

    const afterBreakSummon = playFirstCardOnTarget(
      nextTurn,
      'card_heavy_split_form_talisman',
      summonedEnemy!.instanceId,
    )

    expect(afterBreakSummon.enemies[0].incomingForce).toBe(6)
  })

  it('adds small incoming-force pressure after ordinary abnormal moves resolve', () => {
    const fortuneState = createBattleAtIntent(
      'enemy_fortune_breaker',
      'intent_fortune_breaker_reverse_lot_debt',
    )
    const afterFortuneMove = reduceBattleState(fortuneState, { type: 'END_TURN' }, context)

    expect(afterFortuneMove.enemies[0].currentIntent?.id).toBe(
      'intent_fortune_breaker_crack_lot',
    )
    expect(afterFortuneMove.enemies[0].incomingForce).toBe(7)

    const scrollState = createBattleAtIntent(
      'enemy_scroll_stuffer_clerk',
      'intent_scroll_stuffer_clerk_stuff_scroll',
    )
    const afterScrollMove = reduceBattleState(scrollState, { type: 'END_TURN' }, context)

    expect(afterScrollMove.enemies[0].currentIntent?.id).toBe(
      'intent_scroll_stuffer_clerk_slam_case',
    )
    expect(afterScrollMove.enemies[0].incomingForce).toBe(6)
  })

  it('keeps ash-altar follow-up pressure lower when earth altar counters the prior move', () => {
    const unhandledState = createBattleAtIntent(
      'enemy_ash_altar_child',
      'intent_ash_altar_child_scatter_ash',
    )
    const afterUnhandledMove = reduceBattleState(unhandledState, { type: 'END_TURN' }, context)

    expect(afterUnhandledMove.enemies[0].currentIntent?.id).toBe(
      'intent_ash_altar_child_press_bowl',
    )
    expect(afterUnhandledMove.enemies[0].incomingForce).toBe(6)

    const guardedState = createBattleAtIntent(
      'enemy_ash_altar_child',
      'intent_ash_altar_child_scatter_ash',
      ['card_earth_altar_watch'],
    )
    const earthAltarCard = getHandCard(guardedState, 'card_earth_altar_watch')
    const afterAltar = reduceBattleState(
      guardedState,
      {
        type: 'PLAY_CARD',
        cardInstanceId: earthAltarCard.instanceId,
        targetEnemyInstanceId: guardedState.enemies[0].instanceId,
      },
      context,
    )
    const afterCounteredMove = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(afterCounteredMove.enemies[0].currentIntent?.id).toBe(
      'intent_ash_altar_child_press_bowl',
    )
    expect(afterCounteredMove.enemies[0].incomingForce).toBe(5)
  })

  it('lets elite incoming force remember its prior identity pressure', () => {
    const clerkState = createBattleAtIntent(
      'enemy_incense_clerk',
      'intent_incense_clerk_audit_offering',
    )
    const afterAudit = reduceBattleState(clerkState, { type: 'END_TURN' }, context)
    const afterStamp = reduceBattleState(afterAudit, { type: 'END_TURN' }, context)

    expect(afterStamp.enemies[0].currentIntent?.id).toBe('intent_incense_clerk_lift_censer')
    expect(afterStamp.enemies[0].incomingForce).toBe(9)

    const fireState = createBattleAtIntent(
      'enemy_fire_fleeing_name',
      'intent_fire_fleeing_name_burn_name',
      ['card_ask_name'],
    )
    const afterAsk = playFirstCard(fireState, 'card_ask_name')
    const afterBurn = reduceBattleState(afterAsk, { type: 'END_TURN' }, context)

    expect(afterBurn.enemies[0].currentIntent?.id).toBe(
      'intent_fire_fleeing_name_break_tablet',
    )
    expect(afterBurn.enemies[0].incomingForce).toBe(12)
  })

  it('lets unsealed dipper falling-star pressure shake an active heaven altar', () => {
    const state = createBattleAtIntent(
      'enemy_dipper_empty_shell',
      'intent_dipper_empty_shell_fall_star',
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

    expect(afterAltar.enemies[0].incomingForce).toBe(10)

    const nextTurn = reduceBattleState(afterAltar, { type: 'END_TURN' }, context)

    expect(nextTurn.actionLog).toContainEqual(
      expect.objectContaining({
        type: 'INCOMING_FORCE_AFTEREFFECT',
        payload: expect.objectContaining({
          aftereffectType: 'expire_latest_altar',
          result: 'triggered',
          expiredAltarSlot: 'heaven',
        }),
      }),
    )
    expect(nextTurn.actionLog).toContainEqual(
      expect.objectContaining({
        type: 'ALTAR_EXPIRED',
        payload: expect.objectContaining({
          reason: 'shaken_by_incoming_force',
        }),
      }),
    )
  })

  it('suppresses incoming-force aftereffects when the incoming force is fully sealed', () => {
    const state = createBattleAtIntent(
      'enemy_dipper_empty_shell',
      'intent_dipper_empty_shell_fall_star',
      ['card_heaven_altar_oracle', 'card_press_door_charm', 'card_press_door_charm'],
    )
    const afterAltar = playFirstCard(state, 'card_heaven_altar_oracle')
    const afterFirstSeal = playFirstCard(afterAltar, 'card_press_door_charm')
    const afterSecondSeal = playFirstCard(afterFirstSeal, 'card_press_door_charm')
    const nextTurn = reduceBattleState(afterSecondSeal, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'INCOMING_FORCE_AFTEREFFECT')?.payload).toEqual(
      expect.objectContaining({
        aftereffectType: 'expire_latest_altar',
        result: 'suppressed',
        reason: 'fully_sealed',
      }),
    )
    expect(
      nextTurn.actionLog.some(
        (entry) =>
          entry.type === 'ALTAR_EXPIRED' &&
          entry.payload.reason === 'shaken_by_incoming_force',
      ),
    ).toBe(false)
  })

  it('lets registry-thief final stamp read the opening route pressure', () => {
    const fractureState = createBattleAtIntentWithRisk(
      'enemy_registry_thief',
      'intent_registry_thief_final_stamp',
      {
        resource: 'fracture',
        threshold: 5,
        stateLabel: '高榜裂',
        result: 'boss_high_fracture',
        enemyDefinitionId: 'enemy_registry_thief',
        intentId: 'intent_registry_thief_tear_registry',
      },
    )
    const afterFractureStamp = reduceBattleState(fractureState, { type: 'END_TURN' }, context)

    expect(lastLogOfType(afterFractureStamp, 'INCOMING_FORCE_AFTEREFFECT')?.payload).toEqual(
      expect.objectContaining({
        aftereffectType: 'add_fouled_scroll',
        result: 'triggered',
        addedCardDefinitionId: 'card_fouled_scroll',
        destination: 'discard_pile',
      }),
    )
    expect(afterFractureStamp.discardPile.map((card) => card.definitionId)).toContain(
      'card_fouled_scroll',
    )

    const catalogueState = withEnemyNextIntentPreview(
      createBattleAtIntentWithRisk(
        'enemy_registry_thief',
        'intent_registry_thief_final_stamp',
        {
          resource: 'fracture',
          threshold: 3,
          stateLabel: '归册压力',
          result: 'record_only',
          enemyDefinitionId: 'enemy_registry_thief',
          intentId: 'intent_registry_thief_cloak_stolen_name',
        },
      ),
      'intent_registry_thief_press_registry',
    )
    const afterCatalogueStamp = reduceBattleState(catalogueState, { type: 'END_TURN' }, context)

    expect(lastLogOfType(afterCatalogueStamp, 'INCOMING_FORCE_AFTEREFFECT')?.payload).toEqual(
      expect.objectContaining({
        aftereffectType: 'mask_next_intent',
        result: 'triggered',
      }),
    )
    expect(afterCatalogueStamp.enemies[0].currentIntent?.id).toBe(
      'intent_registry_thief_press_registry',
    )
    expect(afterCatalogueStamp.enemies[0].currentIntentVisibility).toBe('masked')
  })

  it('downgrades scroll-stuffer topdeck pollution after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_scroll_stuffer_clerk',
      'intent_scroll_stuffer_clerk_stuff_scroll',
      ['card_ask_name', 'card_ask_name', 'card_zhu_fu', 'card_zhu_fu', 'card_zhu_fu'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'add_fouled_scroll',
        namedPhaseResult: 'downgraded',
        destination: 'discard_pile',
      }),
    )
  })

  it('downgrades ash-altar stealing after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_ash_altar_child',
      'intent_ash_altar_child_scatter_ash',
      ['card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        amount: 0,
        namedPhaseResult: 'downgraded',
      }),
    )
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_ash_altar_child_press_bowl')
  })

  it('downgrades incense-clerk stealing after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_incense_clerk',
      'intent_incense_clerk_audit_offering',
      ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        amount: 0,
        namedPhaseResult: 'downgraded',
      }),
    )
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_incense_clerk_stamp_case')
  })

  it('prevents registry-thief cloak after actual named phase and shifts toward final stamp', () => {
    const state = createBattleAtIntent(
      'enemy_registry_thief',
      'intent_registry_thief_cloak_stolen_name',
      ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'cover_name',
        result: 'prevented_by_named_phase',
      }),
    )
    expect(nextTurn.player.currentForm).toBe(afterNamed.player.currentForm)
    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_registry_thief_final_stamp')
  })

  it('downgrades registry-thief stable-route stealing after actual named phase', () => {
    const state = createBattleAtIntent(
      'enemy_registry_thief',
      'intent_registry_thief_pinch_offering',
      ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_EXECUTED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'steal_incense',
        amount: 0,
        namedPhaseResult: 'downgraded',
        namedPhaseCondition: 'default',
      }),
    )
    expect(nextTurn.player.incense).toBe(3)
    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_registry_thief_final_stamp')
  })

  it('prevents registry-thief catalogue-route final stamp from masking the previewed next intent', () => {
    const state = withEnemyNextIntentPreview(
      createBattleAtIntentWithRisk(
        'enemy_registry_thief',
        'intent_registry_thief_final_stamp',
        {
          resource: 'fracture',
          threshold: 3,
          stateLabel: '归册压力',
          result: 'record_only',
          enemyDefinitionId: 'enemy_registry_thief',
          intentId: 'intent_registry_thief_cloak_stolen_name',
        },
        ['card_ask_name', 'card_ask_name', 'card_ask_name'],
      ),
      'intent_registry_thief_press_registry',
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'INCOMING_FORCE_AFTEREFFECT')?.payload).toEqual(
      expect.objectContaining({
        aftereffectType: 'mask_next_intent',
        result: 'prevented_by_named_phase',
        namedPhaseResult: 'disabled',
        namedPhaseCondition: 'boss_route_catalogue',
      }),
    )
    expect(nextTurn.enemies[0].currentIntent?.id).toBe(
      'intent_registry_thief_press_registry',
    )
    expect(nextTurn.enemies[0].currentIntentVisibility).toBe('revealed')
  })

  it('prevents registry-thief fracture-route scroll stuffing after actual named phase', () => {
    const state = createBattleAtIntentWithRisk(
      'enemy_registry_thief',
      'intent_registry_thief_tear_registry',
      {
        resource: 'fracture',
        threshold: 5,
        stateLabel: '高榜裂',
        result: 'boss_high_fracture',
        enemyDefinitionId: 'enemy_registry_thief',
        intentId: 'intent_registry_thief_tear_registry',
      },
      ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'ABNORMAL_MOVE_COUNTERED')?.payload).toEqual(
      expect.objectContaining({
        moveType: 'add_fouled_scroll',
        result: 'prevented_by_named_phase',
        namedPhaseResult: 'disabled',
        namedPhaseCondition: 'boss_route_fracture',
      }),
    )
    expect(nextTurn.discardPile.map((card) => card.definitionId)).not.toContain(
      'card_fouled_scroll',
    )
  })

  it('prevents registry-thief fracture-route final stamp from adding fouled scrolls', () => {
    const state = createBattleAtIntentWithRisk(
      'enemy_registry_thief',
      'intent_registry_thief_final_stamp',
      {
        resource: 'fracture',
        threshold: 5,
        stateLabel: '高榜裂',
        result: 'boss_high_fracture',
        enemyDefinitionId: 'enemy_registry_thief',
        intentId: 'intent_registry_thief_tear_registry',
      },
      ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    )
    const afterNamed = nameFirstEnemy(state)
    const nextTurn = reduceBattleState(afterNamed, { type: 'END_TURN' }, context)

    expect(lastLogOfType(nextTurn, 'INCOMING_FORCE_AFTEREFFECT')?.payload).toEqual(
      expect.objectContaining({
        aftereffectType: 'add_fouled_scroll',
        result: 'prevented_by_named_phase',
        namedPhaseResult: 'disabled',
        namedPhaseCondition: 'boss_route_fracture',
      }),
    )
    expect(nextTurn.discardPile.map((card) => card.definitionId)).not.toContain(
      'card_fouled_scroll',
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

function createBattleAtIntentWithRisk(
  enemyDefinitionId: EnemyId,
  intentId: string,
  openingRiskLogRecord: OpeningRiskLogRecord,
  deckDefinitionIds?: readonly CardId[],
) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: getEnemy(enemyDefinitionId),
    deckDefinitionIds,
    initialEnemyIntentIds: {
      [enemyDefinitionId]: intentId,
    },
    openingRiskLogRecords: [openingRiskLogRecord],
  })
}

function withEnemyNextIntentPreview(state: CombatState, intentId: string): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy, index) => {
      if (index !== 0) {
        return enemy
      }

      const definition = getEnemy(enemy.definitionId)
      const intent = definition.intents.find((candidate) => candidate.id === intentId)

      return {
        ...enemy,
        nextIntentPreview: intent,
      }
    }),
  }
}

function playFirstCard(state: CombatState, definitionId: CardId) {
  return playFirstCardOnTarget(state, definitionId, state.enemies[0].instanceId)
}

function nameFirstEnemy(state: CombatState) {
  let nextState = state
  const nameSlotCount = state.enemies[0].nameSlots.length

  for (let index = 0; index < nameSlotCount; index += 1) {
    nextState = playFirstCard(nextState, 'card_ask_name')
  }

  return nextState
}

function playFirstCardOnTarget(
  state: CombatState,
  definitionId: CardId,
  targetEnemyInstanceId: string,
) {
  const card = getHandCard(state, definitionId)

  return reduceBattleState(
    state,
    {
      type: 'PLAY_CARD',
      cardInstanceId: card.instanceId,
      targetEnemyInstanceId,
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

function withPlayerIncense(state: CombatState, incense: number): CombatState {
  return {
    ...state,
    player: {
      ...state.player,
      incense,
    },
  }
}
