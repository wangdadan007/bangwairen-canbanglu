import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  createInitialTutorialRunState,
  createTutorialRedInkOfferIfNeeded,
  createUnlockState,
  reduceBattleState,
  resolveTutorialRedInk,
  type BattleReducerContext,
} from '../core'
import { gameData } from '../data'
import type { CardId, CombatState, RunDeckCard } from '../types'

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
    expect(createTutorialRedInkOfferIfNeeded(redInkRun).pendingRedInk?.options.map((option) => option.id)).toEqual([
      'red_ink_return_incense',
      'red_ink_trace_name',
      'red_ink_named_draw',
      'red_ink_press_momentum',
    ])
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
})

function withRedInkUnlocked<T extends { readonly unlocks: unknown }>(run: T) {
  return {
    ...run,
    unlocks: createUnlockState(
      ['stage_core', 'stage_abnormal_boundary', 'stage_red_ink_preview'],
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
