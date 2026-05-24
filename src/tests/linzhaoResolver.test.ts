import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  createInitialTutorialRunState,
  createTutorialRedInkOfferIfNeeded,
  createUnlockState,
  getVisibleRedInkOptionsForDeckCard,
  isRedInkOptionCompatibleWithCard,
  reduceBattleState,
  RED_INK_OPTIONS,
  resolveTutorialRedInk,
  type BattleReducerContext,
} from '../core'
import { gameData } from '../data'
import type { CardId, CombatState, RunDeckCard } from '../types'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T80 linzhao battle rules', () => {
  it('places a linzhao card into the linzhao zone instead of discard or exhaust', () => {
    const state = createBattle(['card_trace_name_slip'])
    const nextState = playCard(state, 'card_trace_name_slip')

    expect(nextState.linzhao).toHaveLength(1)
    expect(nextState.linzhao[0]).toEqual(
      expect.objectContaining({
        linzhaoId: 'linzhao_mingzhu',
        trigger: 'ask_name_next_break',
      }),
    )
    expect(nextState.hand.some((card) => card.definitionId === 'card_trace_name_slip')).toBe(false)
    expect(nextState.discardPile.some((card) => card.definitionId === 'card_trace_name_slip')).toBe(false)
    expect(nextState.exhaustPile.some((card) => card.definitionId === 'card_trace_name_slip')).toBe(false)
    expect(nextState.linzhaoPile.some((card) => card.definitionId === 'card_trace_name_slip')).toBe(true)
    expect(nextState.actionLog.map((entry) => entry.type)).toContain('LINZHAO_PLACED')
  })

  it('rejects duplicate linzhao and respects the two-slot limit', () => {
    const duplicateState = createBattle(['card_trace_name_slip', 'card_trace_name_slip'])
    const afterFirst = playCard(duplicateState, 'card_trace_name_slip')
    const incenseAfterFirst = afterFirst.player.incense
    const afterDuplicate = playCard(afterFirst, 'card_trace_name_slip')

    expect(afterDuplicate.player.incense).toBe(incenseAfterFirst)
    expect(afterDuplicate.linzhao).toHaveLength(1)
    expect(afterDuplicate.actionLog[afterDuplicate.actionLog.length - 1]).toEqual(
      expect.objectContaining({
        type: 'CARD_PLAY_REJECTED',
        payload: expect.objectContaining({
          reason: 'linzhao_duplicate',
        }),
      }),
    )

    const limitState = createBattle([
      'card_trace_name_slip',
      'card_name_net_talisman',
      'card_red_ink_trial',
    ])
    const afterTwo = playCard(
      playCard(limitState, 'card_trace_name_slip'),
      'card_name_net_talisman',
    )
    const afterLimit = playCard(afterTwo, 'card_red_ink_trial')

    expect(afterLimit.linzhao).toHaveLength(2)
    expect(afterLimit.actionLog[afterLimit.actionLog.length - 1]).toEqual(
      expect.objectContaining({
        type: 'CARD_PLAY_REJECTED',
        payload: expect.objectContaining({
          reason: 'linzhao_limit_reached',
        }),
      }),
    )
  })

  it('turns ask-name into a one-turn pending break-shape bonus', () => {
    const state = createBattle(['card_trace_name_slip', 'card_ask_name', 'card_zhu_fu'])
    const afterLinzhao = playCard(state, 'card_trace_name_slip')
    const afterAskName = playCard(afterLinzhao, 'card_ask_name')
    const afterBreak = playCard(afterAskName, 'card_zhu_fu')

    expect(afterAskName.pendingLinzhaoBreakShapeBonus?.amount).toBe(1)
    expect(afterBreak.pendingLinzhaoBreakShapeBonus).toBeUndefined()
    expect(afterBreak.enemies[0].currentForm).toBe(12)
    expect(
      afterBreak.actionLog.some(
        (entry) =>
          entry.type === 'LINZHAO_TRIGGERED' &&
          entry.payload.result === 'consumed_break_bonus',
      ),
    ).toBe(true)
  })

  it('converts full seal into break-shape through a pressure linzhao', () => {
    const state = createBattle(['card_name_net_talisman', 'card_press_door_charm'])
    const afterLinzhao = playCard(state, 'card_name_net_talisman')
    const afterSeal = playCard(afterLinzhao, 'card_press_door_charm')

    expect(afterSeal.enemies[0].incomingForce).toBe(0)
    expect(afterSeal.enemies[0].currentForm).toBe(16)
    expect(
      afterSeal.actionLog.some(
        (entry) =>
          entry.type === 'LINZHAO_TRIGGERED' &&
          entry.payload.result === 'break_after_full_seal',
      ),
    ).toBe(true)
  })

  it('clears active linzhao when the battle settles', () => {
    const state = createBattle([
      'card_trace_name_slip',
      'card_heavy_split_form_talisman',
      'card_heavy_split_form_talisman',
    ])
    const afterLinzhao = playCard(state, 'card_trace_name_slip')
    const afterFirstBreak = playCard(afterLinzhao, 'card_heavy_split_form_talisman')
    const afterVictory = playCard(afterFirstBreak, 'card_heavy_split_form_talisman')

    expect(afterVictory.result.status).toBe('victory')
    expect(afterVictory.linzhao).toHaveLength(0)
    expect(afterVictory.actionLog.map((entry) => entry.type)).toContain('LINZHAO_CLEARED')
  })

  it('allows safe red ink annotations on linzhao cards, but keeps refund loops out', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      {
        ...createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_trace_name_slip'],
        ),
        unlocks: createUnlockState(
          ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview'],
          gameData.tutorialUnlocks,
        ),
      },
    )
    const targetCard = run.deckCards[0]
    const definition = gameData.cards.find((card) => card.id === targetCard.definitionId)
    const traceName = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_trace_name')
    const returnIncense = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_return_incense')
    const visibleIds = getVisibleRedInkOptionsForDeckCard(
      run.pendingRedInk!,
      targetCard,
      definition,
    ).map((option) => option.id)

    expect(traceName && definition && isRedInkOptionCompatibleWithCard(traceName, definition)).toBe(true)
    expect(
      returnIncense &&
        definition &&
        isRedInkOptionCompatibleWithCard(returnIncense, definition),
    ).toBe(false)
    expect(visibleIds).toContain('red_ink_trace_name')
    expect(visibleIds).not.toContain('red_ink_return_incense')

    const annotatedRun = resolveTutorialRedInk(run, {
      deckCardId: targetCard.id,
      annotationId: 'red_ink_trace_name',
      cardDefinitions: gameData.cards,
    })
    const nextState = playCard(
      createBattle(annotatedRun.deckCards.map((card) => card.definitionId), annotatedRun.deckCards),
      'card_trace_name_slip',
    )

    expect(nextState.linzhao).toHaveLength(1)
    expect(nextState.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['LINZHAO_PLACED', 'CARD_ANNOTATION_TRIGGERED', 'NAME_ASKED']),
    )
  })
})

function createBattle(
  extraHandDefinitionIds: readonly CardId[],
  deckCards?: readonly RunDeckCard[],
) {
  const deckDefinitionIds = deckCards
    ? deckCards.map((card) => card.definitionId)
    : ['card_guard_desk_talisman', 'card_cut_supply_talisman', 'card_zhu_fu']

  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: gameData.enemies[0],
    deckDefinitionIds,
    deckCards,
    openingHandDefinitionIds: deckCards ? extraHandDefinitionIds : [],
    extraHandDefinitionIds: deckCards ? [] : extraHandDefinitionIds,
  })
}

function playCard(state: CombatState, definitionId: CardId) {
  const card = state.hand.find((candidate) => candidate.definitionId === definitionId)

  if (!card) {
    throw new Error(`Expected card in hand: ${definitionId}`)
  }

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
