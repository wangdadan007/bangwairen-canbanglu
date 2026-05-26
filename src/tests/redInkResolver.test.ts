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

describe('T98 directed red ink', () => {
  it('creates a one-main-option red ink offer only after the preview stage is unlocked', () => {
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

    expect(offer?.displayCount).toBe(1)
    expect(offer?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        mainRedInkId('card_zhu_fu'),
        mainRedInkId('card_ask_name'),
        mainRedInkId('card_guard_desk_talisman'),
        mainRedInkId('card_cut_supply_talisman'),
      ]),
    )
  })

  it('maps each permanent card to exactly one main red ink option', () => {
    const permanentCardIds = gameData.cards
      .filter((card) => card.type !== 'temporary' && !card.tags.includes('temporary'))
      .map((card) => card.id)
    const optionCardIds = RED_INK_OPTIONS.map((option) => option.cardDefinitionId)

    expect(RED_INK_OPTIONS).toHaveLength(permanentCardIds.length)
    expect(new Set(optionCardIds).size).toBe(permanentCardIds.length)
    expect(optionCardIds).toEqual(expect.arrayContaining(permanentCardIds))
    expect(optionCardIds).not.toContain('card_fouled_scroll')
    expect(optionCardIds).not.toContain('card_doom_ash')
    expect(optionCardIds).not.toContain('card_cracked_whip_echo')
  })

  it('shows only the selected card main red ink option', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_guard_desk_talisman'],
        ),
        ['stage_abnormal_boundary'],
      ),
    )
    const targetCard = run.deckCards[0]
    const definition = getCard('card_guard_desk_talisman')
    const guardMain = RED_INK_OPTIONS.find(
      (option) => option.id === mainRedInkId('card_guard_desk_talisman'),
    )
    const zhuMain = RED_INK_OPTIONS.find((option) => option.id === mainRedInkId('card_zhu_fu'))

    expect(guardMain && isRedInkOptionCompatibleWithCard(guardMain, definition)).toBe(true)
    expect(zhuMain && isRedInkOptionCompatibleWithCard(zhuMain, definition)).toBe(false)
    expect(
      getVisibleRedInkOptionsForDeckCard(run.pendingRedInk!, targetCard, definition).map(
        (option) => option.id,
      ),
    ).toEqual([mainRedInkId('card_guard_desk_talisman')])
  })

  it('keeps loop-prone zero-cost cards on conditional main effects', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_order_scroll', 'card_quiet_incense', 'card_mirror_slip'],
        ),
        ['stage_run_resources'],
      ),
    )

    for (const cardId of ['card_order_scroll', 'card_quiet_incense', 'card_mirror_slip']) {
      const targetCard = run.deckCards.find((card) => card.definitionId === cardId)
      const definition = getCard(cardId)
      const visibleOptions = getVisibleRedInkOptionsForDeckCard(
        run.pendingRedInk!,
        targetCard,
        definition,
      )

      expect(visibleOptions.map((option) => option.id)).toEqual([mainRedInkId(cardId)])
      expect(
        visibleOptions[0].annotation.effects.every((effect) => Boolean(effect.condition)),
      ).toBe(true)
    }
  })

  it('applies a permanent main red ink annotation to one run deck card', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(createInitialTutorialRunState(gameData.tutorialUnlocks)),
    )
    const targetCard = run.deckCards.find((card) => card.definitionId === 'card_zhu_fu')

    if (!targetCard) {
      throw new Error('Expected Zhu Fu in starter deck')
    }

    const nextRun = resolveTutorialRedInk(run, {
      deckCardId: targetCard.id,
      annotationId: mainRedInkId('card_zhu_fu'),
      cardDefinitions: gameData.cards,
    })
    const updatedCard = nextRun.deckCards.find((card) => card.id === targetCard.id)

    expect(nextRun.pendingRedInk).toBeUndefined()
    expect(updatedCard?.annotations.map((annotation) => annotation.id)).toEqual([
      mainRedInkId('card_zhu_fu'),
    ])
    expect(nextRun.redInkRecords).toEqual([
      expect.objectContaining({
        deckCardId: targetCard.id,
        cardDefinitionId: 'card_zhu_fu',
        annotationId: mainRedInkId('card_zhu_fu'),
        skipped: false,
      }),
    ])
  })

  it('keeps main red ink effects when the annotated card enters a later battle', () => {
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
      annotationId: mainRedInkId('card_zhu_fu'),
      cardDefinitions: gameData.cards,
    })
    const state = revealFirstNameSlot(
      createBattle(nextRun.deckCards.map((card) => card.definitionId), nextRun.deckCards),
    )
    const nextState = playFirstCard(state, 'card_zhu_fu')

    expect(nextState.enemies[0].currentForm).toBe(10)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['CARD_ANNOTATION_TRIGGERED', 'FORM_BROKEN']),
    )
  })

  it('can turn a linzhao card into a one-shot ask-name setup', () => {
    const run = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_trace_name_slip'],
        ),
        ['stage_human_altar'],
      ),
    )
    const nextRun = resolveTutorialRedInk(run, {
      deckCardId: run.deckCards[0].id,
      annotationId: mainRedInkId('card_trace_name_slip'),
      cardDefinitions: gameData.cards,
    })
    const nextState = playFirstCard(
      createBattle(nextRun.deckCards.map((card) => card.definitionId), nextRun.deckCards),
      'card_trace_name_slip',
    )

    expect(nextState.linzhao).toHaveLength(1)
    expect(nextState.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['LINZHAO_PLACED', 'CARD_ANNOTATION_TRIGGERED', 'NAME_ASKED']),
    )
  })

  it('supports source-scoped naming and full-seal red ink conditions', () => {
    const namedDrawOfferRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          [
            'card_ask_name',
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
      annotationId: mainRedInkId('card_ask_name'),
      cardDefinitions: gameData.cards,
    })
    const drawBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[1],
      deckDefinitionIds: namedDrawRun.deckCards.map((card) => card.definitionId),
      deckCards: namedDrawRun.deckCards,
    })
    const afterNamedDraw = playFirstCard(drawBattle, 'card_ask_name')

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
      annotationId: mainRedInkId('card_guard_desk_talisman'),
      cardDefinitions: gameData.cards,
    })
    const controlBattle = createBattle(
      controlRun.deckCards.map((card) => card.definitionId),
      controlRun.deckCards,
    )
    const afterControl = playFirstCard(
      {
        ...controlBattle,
        enemies: controlBattle.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                incomingForce: 3,
              }
            : enemy,
        ),
      },
      'card_guard_desk_talisman',
    )

    expect(afterControl.enemies[0].incomingForce).toBe(0)
    expect(afterControl.enemies[0].currentForm).toBe(16)
    expect(afterControl.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['CARD_ANNOTATION_TRIGGERED', 'INCOMING_FORCE_SEALED']),
    )
  })

  it('applies conditional resource and risk red ink annotations after their unlock stages', () => {
    const resourceRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_mirror_slip', 'card_ask_name'],
        ),
        ['stage_run_resources'],
      ),
    )
    const mirrorCard = resourceRun.deckCards.find((card) => card.definitionId === 'card_mirror_slip')
    const inkRun = resolveTutorialRedInk(resourceRun, {
      deckCardId: mirrorCard?.id ?? '',
      annotationId: mainRedInkId('card_mirror_slip'),
      cardDefinitions: gameData.cards,
    })
    const afterInk = playFirstCard(
      playFirstCard(
        createInitialBattleState({
          cardDefinitions: gameData.cards,
          enemyDefinition: gameData.enemies[1],
          deckDefinitionIds: inkRun.deckCards.map((card) => card.definitionId),
          deckCards: inkRun.deckCards,
        }),
        'card_ask_name',
      ),
      'card_mirror_slip',
    )

    expect(afterInk.resources.ink).toBe(2)
    expect(afterInk.actionLog.map((entry) => entry.type)).toContain('INK_GAINED')

    const riskRun = createTutorialRedInkOfferIfNeeded(
      withRedInkUnlocked(
        createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          ['encounter_tutorial_paper_wraith'],
          ['card_borrowed_doom_talisman'],
        ),
        ['stage_run_resources'],
      ),
    )
    const doomRun = resolveTutorialRedInk(riskRun, {
      deckCardId: riskRun.deckCards[0].id,
      annotationId: mainRedInkId('card_borrowed_doom_talisman'),
      cardDefinitions: gameData.cards,
    })
    const namedState = nameFirstEnemy(
      createBattle(doomRun.deckCards.map((card) => card.definitionId), doomRun.deckCards),
    )
    const afterDoom = playFirstCard(namedState, 'card_borrowed_doom_talisman')

    expect(afterDoom.resources.doom).toBe(1)
    expect(afterDoom.enemies[0].currentForm).toBe(16)
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
      [
        'stage_core',
        'stage_abnormal_boundary',
        'stage_red_ink_preview',
        ...extraStages,
      ],
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

function revealFirstNameSlot(state: CombatState): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy, enemyIndex) =>
      enemyIndex === 0
        ? {
            ...enemy,
            nameSlots: enemy.nameSlots.map((slot, slotIndex) =>
              slotIndex === 0
                ? {
                    ...slot,
                    isRevealed: true,
                  }
                : slot,
            ),
          }
        : enemy,
    ),
  }
}

function nameFirstEnemy(state: CombatState): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy, enemyIndex) =>
      enemyIndex === 0
        ? {
            ...enemy,
            isNamed: true,
            nameSlots: enemy.nameSlots.map((slot) => ({
              ...slot,
              isRevealed: true,
            })),
          }
        : enemy,
    ),
  }
}

function getCard(cardId: CardId) {
  const card = gameData.cards.find((candidate) => candidate.id === cardId)

  if (!card) {
    throw new Error(`Missing card definition: ${cardId}`)
  }

  return card
}

function mainRedInkId(cardId: CardId) {
  return `red_ink_main_${cardId.replace(/^card_/, '')}`
}
