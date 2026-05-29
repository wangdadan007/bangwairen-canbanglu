import { describe, expect, it } from 'vitest'
import { gameData } from '../data'
import {
  createInitialArtifactCollection,
  createInitialBattleState,
  reduceBattleState,
  type BattleReducerContext,
} from '../core'
import type { CombatState, EnemyDefinition, EnemyId } from '../types'

const paperWraith = gameData.enemies[0]
const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('name resolver', () => {
  it('asks name and reveals one unrevealed name slot', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
      deckDefinitionIds: ['card_ask_name'],
    })
    const askName = state.hand[0]

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(nextState.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(nextState.enemies[0].nameSlots[1].isRevealed).toBe(false)
    expect(nextState.enemies[0].isNamed).toBe(false)
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['NAME_ASKED', 'NAME_SLOT_REVEALED']),
    )
  })

  it('names enemy after all name slots are revealed and uses discern fallback on later ask-name', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
      deckDefinitionIds: ['card_ask_name', 'card_ask_name', 'card_ask_name'],
    })
    const [firstAsk, secondAsk, thirdAsk] = state.hand

    const afterFirstAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterSecondAsk = reduceBattleState(
      afterFirstAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: secondAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterThirdAsk = reduceBattleState(
      afterSecondAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: thirdAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(afterSecondAsk.enemies[0].isNamed).toBe(true)
    expect(afterSecondAsk.enemies[0].hasTriggeredNameBreak).toBe(true)
    expect(afterSecondAsk.enemies[0].currentForm).toBe(12)
    expect(afterSecondAsk.enemies[0].nextIntentPreview).toBeUndefined()
    expect(afterThirdAsk.enemies[0].currentForm).toBe(11)
    expect(afterThirdAsk.enemies[0].nextIntentPreview).toBeUndefined()
    expect(afterThirdAsk.actionLog.filter((entry) => entry.type === 'NAME_BREAK_TRIGGERED')).toHaveLength(1)
    expect(
      afterThirdAsk.actionLog.filter(
        (entry) => entry.type === 'NAME_ASKED' && entry.payload.result === 'discern_intent',
      ),
    ).toHaveLength(1)
    expect(
      afterThirdAsk.actionLog.filter(
        (entry) => entry.type === 'INTENT_DISCERNED' && entry.payload.result === 'no_altar',
      ),
    ).toHaveLength(1)
    expect(
      afterThirdAsk.actionLog.filter(
        (entry) => entry.type === 'FORM_BROKEN' && entry.payload.amount === 1,
      ),
    ).toHaveLength(1)
    expect(afterThirdAsk.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['ENEMY_NAMED', 'NAME_BREAK_TRIGGERED']),
    )
  })

  it('does not consume pending break-shape bonuses on named ask-name fallback', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
      deckDefinitionIds: ['card_ask_name', 'card_ask_name', 'card_ask_name'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
    })
    const [firstAsk, secondAsk, thirdAsk] = state.hand
    const afterFirstAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterSecondAsk = reduceBattleState(
      afterFirstAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: secondAsk.instanceId,
        targetEnemyInstanceId: afterFirstAsk.enemies[0].instanceId,
      },
      context,
    )
    const afterThirdAsk = reduceBattleState(
      afterSecondAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: thirdAsk.instanceId,
        targetEnemyInstanceId: afterSecondAsk.enemies[0].instanceId,
      },
      context,
    )

    expect(afterSecondAsk.pendingArtifactBreakShapeBonus).toEqual({
      artifactId: 'artifact_whip_fragment',
      amount: 2,
      requiresBreakShapeCard: true,
    })
    expect(afterThirdAsk.enemies[0].currentForm).toBe(11)
    expect(afterThirdAsk.pendingArtifactBreakShapeBonus).toEqual({
      artifactId: 'artifact_whip_fragment',
      amount: 2,
      requiresBreakShapeCard: true,
    })
  })

  it('uses discern-intent fallback against nameless enemies and still gives weak form break', () => {
    const namelessEnemy: EnemyDefinition = {
      ...paperWraith,
      id: 'enemy_nameless_paper_scrap',
      maxForm: 18,
      nameSlots: 0,
      nameSlotDefinitions: [],
    }
    const namelessContext: BattleReducerContext = {
      cardDefinitions: gameData.cards,
      enemyDefinitions: [namelessEnemy],
    }
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: namelessEnemy,
      deckDefinitionIds: ['card_ask_name'],
    })
    const askName = state.hand[0]

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      namelessContext,
    )

    const askLog = nextState.actionLog.find((entry) => entry.type === 'NAME_ASKED')
    const discernLog = nextState.actionLog.find((entry) => entry.type === 'INTENT_DISCERNED')
    expect(askLog?.payload.result).toBe('discern_intent')
    expect(discernLog?.payload.result).toBe('no_altar')
    expect(nextState.enemies[0].currentForm).toBe(17)
    expect(nextState.enemies[0].nextIntentPreview).toBeUndefined()
    expect(nextState.enemies[0].isNamed).toBe(false)
  })

  it('extends the next prepared altar when discernment sees an already revealed action', () => {
    const state = withPlayerIncense(
      createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: paperWraith,
        deckDefinitionIds: [
          'card_human_altar_name_sigil',
          'card_ask_name',
          'card_ask_name',
          'card_ask_name',
        ],
      }),
      4,
    )
    const [humanAltar, firstAsk, secondAsk, thirdAsk] = state.hand
    const afterAltar = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: humanAltar.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterFirstAsk = reduceBattleState(
      afterAltar,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstAsk.instanceId,
        targetEnemyInstanceId: afterAltar.enemies[0].instanceId,
      },
      context,
    )
    const afterSecondAsk = reduceBattleState(
      afterFirstAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: secondAsk.instanceId,
        targetEnemyInstanceId: afterFirstAsk.enemies[0].instanceId,
      },
      context,
    )
    const afterThirdAsk = reduceBattleState(
      afterSecondAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: thirdAsk.instanceId,
        targetEnemyInstanceId: afterSecondAsk.enemies[0].instanceId,
      },
      context,
    )
    const nextTurn = reduceBattleState(afterThirdAsk, { type: 'END_TURN' }, context)
    const altarExtensionLog = afterThirdAsk.actionLog.find(
      (entry) => entry.type === 'ALTAR_EXTENDED' && entry.payload.result === 'discerned_current_intent',
    )
    const continuedExtensionLog = nextTurn.actionLog.find(
      (entry) => entry.type === 'ALTAR_EXTENDED' && entry.payload.result === 'continued_after_trigger',
    )

    expect(afterThirdAsk.enemies[0].nextIntentPreview).toBeUndefined()
    expect(afterThirdAsk.altars[0]?.slot).toBe('human')
    expect(afterThirdAsk.altars[0]?.remainingTriggers).toBe(2)
    expect(altarExtensionLog?.payload).toEqual(
      expect.objectContaining({
        slot: 'human',
        result: 'discerned_current_intent',
        remainingTriggers: 2,
      }),
    )
    expect(nextTurn.turn).toBe(2)
    expect(nextTurn.enemies[0].currentIntent?.id).toBe('intent_paper_wraith_scrape')
    expect(nextTurn.enemies[0].currentIntentVisibility).toBe('revealed')
    expect(nextTurn.altars[0]?.slot).toBe('human')
    expect(nextTurn.altars[0]?.remainingTriggers).toBe(1)
    expect(continuedExtensionLog?.payload).toEqual(
      expect.objectContaining({
        slot: 'human',
        result: 'continued_after_trigger',
        remainingTriggers: 1,
      }),
    )
  })

  it('lets bone mirror reveal a masked elite intent before previewing later moves', () => {
    const incenseClerk = getEnemy('enemy_incense_clerk')
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: incenseClerk,
      deckDefinitionIds: ['card_ask_name'],
      artifacts: createInitialArtifactCollection(gameData.artifacts),
    })
    const askName = state.hand[0]

    expect(state.enemies[0].currentIntentVisibility).toBe('masked')

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      {
        cardDefinitions: gameData.cards,
        enemyDefinitions: [incenseClerk],
      },
    )

    expect(nextState.enemies[0].currentIntentVisibility).toBe('revealed')
    expect(nextState.enemies[0].nextIntentPreview).toBeUndefined()
  })

  it('settles as vanquish when form reaches zero before naming', () => {
    const state = withEnemyCurrentForm(
      createInitialBattleState({
        cardDefinitions: gameData.cards,
        enemyDefinition: paperWraith,
        deckDefinitionIds: ['card_zhu_fu'],
      }),
      4,
    )
    const zhuFu = state.hand[0]

    const nextState = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(nextState.result).toEqual({
      status: 'victory',
      settlement: 'vanquish',
      enemyInstanceId: state.enemies[0].instanceId,
    })
  })

  it('settles as catalogue after naming and then reducing form to zero', () => {
    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: paperWraith,
      deckDefinitionIds: ['card_ask_name', 'card_ask_name', 'card_zhu_fu'],
    })
    const [firstAsk, secondAsk, zhuFu] = state.hand

    const afterFirstAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const afterSecondAsk = reduceBattleState(
      afterFirstAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: secondAsk.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )
    const readyToFinish = withEnemyCurrentForm(afterSecondAsk, 5)
    const nextState = reduceBattleState(
      readyToFinish,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      context,
    )

    expect(nextState.result).toEqual({
      status: 'victory',
      settlement: 'catalogue',
      enemyInstanceId: state.enemies[0].instanceId,
    })
    expect(nextState.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['ENEMY_NAMED', 'NAME_BREAK_TRIGGERED', 'VICTORY_SETTLED']),
    )
  })
})

function getEnemy(definitionId: EnemyId): EnemyDefinition {
  const enemy = gameData.enemies.find((candidate) => candidate.id === definitionId)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${definitionId}`)
  }

  return enemy
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

function withPlayerIncense(state: CombatState, incense: number): CombatState {
  return {
    ...state,
    player: {
      ...state.player,
      incense,
    },
  }
}
