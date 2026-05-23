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

  it('names enemy after all name slots are revealed and triggers name break once', () => {
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
    expect(afterThirdAsk.enemies[0].currentForm).toBe(12)
    expect(afterThirdAsk.actionLog.filter((entry) => entry.type === 'NAME_BREAK_TRIGGERED')).toHaveLength(1)
    expect(afterThirdAsk.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['ENEMY_NAMED', 'NAME_BREAK_TRIGGERED']),
    )
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
    expect(discernLog?.payload.result).toBe('next_previewed')
    expect(nextState.enemies[0].currentForm).toBe(17)
    expect(nextState.enemies[0].nextIntentPreview?.id).toBe('intent_paper_wraith_scrape')
    expect(nextState.enemies[0].isNamed).toBe(false)
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
