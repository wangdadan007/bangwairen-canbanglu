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
import type { CardId, CombatState, RunDeckCard, UnlockStageId } from '../types'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T11 red ink MVP', () => {
  it('creates a red ink offer only after the red ink preview stage is unlocked', () => {
    const coreRun = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const abnormalRun = {
      ...coreRun,
      unlocks: createUnlockState(
        ['stage_core', 'stage_abnormal_boundary'],
        gameData.tutorialUnlocks,
      ),
    }
    const redInkRun = {
      ...coreRun,
      unlocks: createUnlockState(
        ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview'],
        gameData.tutorialUnlocks,
      ),
    }

    expect(createTutorialRedInkOfferIfNeeded(abnormalRun).pendingRedInk).toBeUndefined()
    const offer = createTutorialRedInkOfferIfNeeded(redInkRun).pendingRedInk

    expect(offer?.displayCount).toBe(4)
    expect(offer?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'red_ink_return_incense',
        'red_ink_trace_name',
        'red_ink_named_draw',
        'red_ink_press_momentum',
      ]),
    )
  })

  it('unlocks a 12-option red ink pool over chapter one systems', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(gameData.tutorialUnlocks),
        ['stage_run_resources', 'stage_human_altar', 'stage_three_altars'],
      ),
    )

    expect(RED_INK_OPTIONS).toHaveLength(12)
    expect(run.pendingRedInk?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'red_ink_return_incense',
        'red_ink_ink_drop',
        'red_ink_trace_name',
        'red_ink_named_draw',
        'red_ink_named_echo',
        'red_ink_revealed_break',
        'red_ink_named_break',
        'red_ink_press_momentum',
        'red_ink_counter_draw',
        'red_ink_altar_ink',
        'red_ink_altar_return',
        'red_ink_doom_burst',
      ]),
    )
  })

  it('filters visible red ink options by selected target card compatibility', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_guard_desk_talisman'],
        ),
        ['stage_run_resources', 'stage_human_altar', 'stage_three_altars'],
      ),
    )
    const targetCard = run.deckCards[0]
    const definition = gameData.cards.find((card) => card.id === targetCard.definitionId)
    const pressMomentum = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_press_momentum')
    const counterDraw = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_counter_draw')

    expect(pressMomentum && definition && isRedInkOptionCompatibleWithCard(pressMomentum, definition)).toBe(true)
    expect(counterDraw && definition && isRedInkOptionCompatibleWithCard(counterDraw, definition)).toBe(false)
    expect(
      getVisibleRedInkOptionsForDeckCard(run.pendingRedInk!, targetCard, definition).map(
        (option) => option.id,
      ),
    ).toContain('red_ink_press_momentum')
  })

  it('keeps strong red ink annotations away from low-cost loop pieces', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_order_scroll', 'card_quiet_incense', 'card_red_ink_trial', 'card_zhu_fu'],
        ),
        ['stage_run_resources'],
      ),
    )
    const loopCard = run.deckCards.find((card) => card.definitionId === 'card_order_scroll')
    const loopDefinition = gameData.cards.find((card) => card.id === 'card_order_scroll')
    const strikeCard = run.deckCards.find((card) => card.definitionId === 'card_zhu_fu')
    const strikeDefinition = gameData.cards.find((card) => card.id === 'card_zhu_fu')
    const returnIncense = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_return_incense')
    const traceName = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_trace_name')
    const doomBurst = RED_INK_OPTIONS.find((option) => option.id === 'red_ink_doom_burst')

    expect(
      returnIncense &&
        loopDefinition &&
        isRedInkOptionCompatibleWithCard(returnIncense, loopDefinition),
    ).toBe(false)
    expect(
      traceName &&
        loopDefinition &&
        isRedInkOptionCompatibleWithCard(traceName, loopDefinition),
    ).toBe(false)
    expect(
      doomBurst &&
        loopDefinition &&
        isRedInkOptionCompatibleWithCard(doomBurst, loopDefinition),
    ).toBe(false)
    expect(
      returnIncense &&
        strikeDefinition &&
        isRedInkOptionCompatibleWithCard(returnIncense, strikeDefinition),
    ).toBe(true)
    expect(
      traceName &&
        strikeDefinition &&
        isRedInkOptionCompatibleWithCard(traceName, strikeDefinition),
    ).toBe(true)
    expect(
      doomBurst &&
        strikeDefinition &&
        isRedInkOptionCompatibleWithCard(doomBurst, strikeDefinition),
    ).toBe(true)

    const loopVisibleOptionIds = getVisibleRedInkOptionsForDeckCard(
      run.pendingRedInk!,
      loopCard,
      loopDefinition,
    ).map((option) => option.id)
    const strikeVisibleOptionIds = getVisibleRedInkOptionsForDeckCard(
      run.pendingRedInk!,
      strikeCard,
      strikeDefinition,
    ).map((option) => option.id)

    expect(loopVisibleOptionIds).not.toContain('red_ink_return_incense')
    expect(loopVisibleOptionIds).not.toContain('red_ink_trace_name')
    expect(loopVisibleOptionIds).not.toContain('red_ink_doom_burst')
    expect(
      strikeVisibleOptionIds,
    ).toEqual(
      expect.arrayContaining([
        'red_ink_trace_name',
        'red_ink_doom_burst',
      ]),
    )
  })

  it('applies a permanent red ink annotation to one run deck card', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(createInitialTutorialRunState(gameData.tutorialUnlocks)),
    )
    const targetCard = run.deckCards.find((card) => card.definitionId === 'card_zhu_fu')

    if (!targetCard) {
      throw new Error('Expected Zhu Fu in starter deck')
    }

    const nextRun = resolveTutorialRedInk(run, {
      deckCardId: targetCard.id,
      annotationId: 'red_ink_return_incense',
      cardDefinitions: gameData.cards,
    })
    const updatedCard = nextRun.deckCards.find((card) => card.id === targetCard.id)

    expect(nextRun.pendingRedInk).toBeUndefined()
    expect(updatedCard?.annotations.map((annotation) => annotation.id)).toEqual([
      'red_ink_return_incense',
    ])
    expect(nextRun.redInkRecords).toEqual([
      expect.objectContaining({
        deckCardId: targetCard.id,
        cardDefinitionId: 'card_zhu_fu',
        annotationId: 'red_ink_return_incense',
        skipped: false,
      }),
    ])
  })

  it('keeps red ink effects when the annotated card enters a later battle', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_zhu_fu'],
        ),
      ),
    )
    const nextRun = resolveTutorialRedInk(run, {
      deckCardId: run.deckCards[0].id,
      annotationId: 'red_ink_return_incense',
      cardDefinitions: gameData.cards,
    })
    const state = createBattle(nextRun.deckCards.map((card) => card.definitionId), nextRun.deckCards)
    const nextState = playFirstCard(state, 'card_zhu_fu')

    expect(nextState.player.incense).toBe(3)
    expect(nextState.enemies[0].currentForm).toBe(14)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['CARD_ANNOTATION_TRIGGERED', 'INCENSE_GAINED']),
    )
  })

  it('can add an extra ask-name annotation instead of a pure number bump', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_zhu_fu'],
        ),
      ),
    )
    const nextRun = resolveTutorialRedInk(run, {
      deckCardId: run.deckCards[0].id,
      annotationId: 'red_ink_trace_name',
      cardDefinitions: gameData.cards,
    })
    const state = createBattle(nextRun.deckCards.map((card) => card.definitionId), nextRun.deckCards)
    const nextState = playFirstCard(state, 'card_zhu_fu')

    expect(nextState.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['CARD_ANNOTATION_TRIGGERED', 'NAME_ASKED', 'NAME_SLOT_REVEALED']),
    )
  })

  it('adds T54 red ink annotations for named-turn draw and pressure control', () => {
    const namedDrawOfferRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          [
            'card_mark_forehead',
            'card_zhu_fu',
            'card_zhu_fu',
            'card_zhu_fu',
            'card_zhu_fu',
            'card_guard_desk_talisman',
          ],
        ),
      ),
    )
    const namedDrawRun = resolveTutorialRedInk(namedDrawOfferRun, {
      deckCardId: namedDrawOfferRun.deckCards[0].id,
      annotationId: 'red_ink_named_draw',
      cardDefinitions: gameData.cards,
    })
    const drawBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckDefinitionIds: namedDrawRun.deckCards.map((card) => card.definitionId),
      deckCards: namedDrawRun.deckCards,
    })
    const afterNamedDraw = playFirstCard(drawBattle, 'card_mark_forehead')

    expect(
      afterNamedDraw.actionLog
        .filter((entry) => entry.type === 'CARD_DRAWN')
        .map((entry) => entry.payload.cardDefinitionId),
    ).toContain('card_guard_desk_talisman')

    const controlOfferRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_guard_desk_talisman'],
        ),
      ),
    )
    const controlRun = resolveTutorialRedInk(controlOfferRun, {
      deckCardId: controlOfferRun.deckCards[0].id,
      annotationId: 'red_ink_press_momentum',
      cardDefinitions: gameData.cards,
    })
    const controlBattle = createBattle(
      controlRun.deckCards.map((card) => card.definitionId),
      controlRun.deckCards,
    )
    const afterControl = playFirstCard(controlBattle, 'card_guard_desk_talisman')

    expect(afterControl.enemies[0].incomingForce).toBe(0)
    expect(afterControl.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['CARD_ANNOTATION_TRIGGERED', 'INCOMING_FORCE_SEALED']),
    )
  })

  it('applies resource and risk red ink annotations after their unlock stages', () => {
    const resourceRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_zhu_fu'],
        ),
        ['stage_run_resources'],
      ),
    )
    const inkRun = resolveTutorialRedInk(resourceRun, {
      deckCardId: resourceRun.deckCards[0].id,
      annotationId: 'red_ink_ink_drop',
      cardDefinitions: gameData.cards,
    })
    const afterInk = playFirstCard(
      createBattle(inkRun.deckCards.map((card) => card.definitionId), inkRun.deckCards),
      'card_zhu_fu',
    )

    expect(afterInk.resources.ink).toBe(1)
    expect(afterInk.actionLog.map((entry) => entry.type)).toContain('INK_GAINED')

    const riskRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_zhu_fu'],
        ),
        ['stage_run_resources'],
      ),
    )
    const doomRun = resolveTutorialRedInk(riskRun, {
      deckCardId: riskRun.deckCards[0].id,
      annotationId: 'red_ink_doom_burst',
      cardDefinitions: gameData.cards,
    })
    const afterDoom = playFirstCard(
      createBattle(doomRun.deckCards.map((card) => card.definitionId), doomRun.deckCards),
      'card_zhu_fu',
    )

    expect(afterDoom.resources.doom).toBe(1)
    expect(afterDoom.actionLog.map((entry) => entry.type)).toContain('DOOM_GAINED')
  })
})

function withRedInkUnlocked<T extends { readonly unlocks: unknown }>(
  run: T,
  extraStages: readonly UnlockStageId[] = [],
) {
  return {
    ...run,
    unlocks: createUnlockState(
      ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview', ...extraStages],
      gameData.tutorialUnlocks,
    ),
  }
}

function createBattle(deckDefinitionIds: readonly CardId[], deckCards: readonly RunDeckCard[]) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: gameData.enemies[0],
    deckDefinitionIds,
    deckCards,
  })
}

function playFirstCard(state: CombatState, definitionId: CardId) {
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
