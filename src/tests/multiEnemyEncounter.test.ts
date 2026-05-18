import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  getEncounterEnemyDefinitionIds,
  reduceBattleState,
  type BattleReducerContext,
} from '../core'
import { getEncounterDefinition, getEnemyDefinition, gameData } from '../data'
import type { CardId, CombatState, EnemyDefinition } from '../types'

const context: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T42A multi-enemy encounter MVP', () => {
  it('loads multi-enemy slots while keeping the primary enemy fallback', () => {
    const encounter = getEncounterDefinition('encounter_multi_paper_wraith_imp', gameData)

    if (!encounter) {
      throw new Error('Missing encounter_multi_paper_wraith_imp')
    }

    expect(encounter.enemyDefinitionId).toBe('enemy_paper_wraith')
    expect(getEncounterEnemyDefinitionIds(encounter)).toEqual([
      'enemy_paper_wraith',
      'enemy_nameless_paper_imp',
    ])
  })

  it('keeps old single-enemy encounters compatible', () => {
    const encounter = getEncounterDefinition('encounter_tutorial_paper_wraith', gameData)

    if (!encounter) {
      throw new Error('Missing encounter_tutorial_paper_wraith')
    }

    expect(encounter.enemySlots).toBeUndefined()
    expect(getEncounterEnemyDefinitionIds(encounter)).toEqual(['enemy_paper_wraith'])
  })

  it('settles individual enemies but waits for all enemies before battle victory', () => {
    const state = createBattle(['card_thunder_splinter', 'card_zhu_fu'], [
      getEnemy('enemy_paper_wraith'),
      getEnemy('enemy_nameless_paper_imp'),
    ])
    const primary = state.enemies[0]
    const imp = state.enemies[1]
    const thunder = getHandCard(state, 'card_thunder_splinter')
    const afterImp = reduceBattleState(
      withEnemyCurrentForm(state, imp.instanceId, 8),
      {
        type: 'PLAY_CARD',
        cardInstanceId: thunder.instanceId,
        targetEnemyInstanceId: imp.instanceId,
      },
      context,
    )
    const zhuFu = getHandCard(afterImp, 'card_zhu_fu')
    const readyToFinish = withEnemyCurrentForm(afterImp, primary.instanceId, 4)
    const afterPrimary = reduceBattleState(
      readyToFinish,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: primary.instanceId,
      },
      context,
    )

    expect(afterImp.enemies[1].currentForm).toBe(0)
    expect(afterImp.result.status).toBe('ongoing')
    expect(afterImp.actionLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ENEMY_SETTLED',
          targetId: imp.instanceId,
          payload: expect.objectContaining({
            settlement: 'vanquish',
          }),
        }),
      ]),
    )
    expect(afterPrimary.result).toEqual({
      status: 'victory',
      settlement: 'vanquish',
      enemyInstanceId: primary.instanceId,
    })
    expect(afterPrimary.actionLog.filter((entry) => entry.type === 'ENEMY_SETTLED')).toHaveLength(2)
  })

  it('keeps target-specific ask-name and break-form results separated', () => {
    const state = createBattle(['card_ask_name', 'card_zhu_fu'], [
      getEnemy('enemy_paper_wraith'),
      getEnemy('enemy_nameless_paper_imp'),
    ])
    const primary = state.enemies[0]
    const imp = state.enemies[1]
    const askName = getHandCard(state, 'card_ask_name')
    const afterAsk = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: primary.instanceId,
      },
      context,
    )
    const zhuFu = getHandCard(afterAsk, 'card_zhu_fu')
    const afterBreakImp = reduceBattleState(
      afterAsk,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: imp.instanceId,
      },
      context,
    )

    expect(afterAsk.enemies[0].nameSlots[0].isRevealed).toBe(true)
    expect(afterAsk.enemies[1].nameSlots).toHaveLength(0)
    expect(afterBreakImp.enemies[0].currentForm).toBe(18)
    expect(afterBreakImp.enemies[1].currentForm).toBe(6)
    expect(
      afterBreakImp.actionLog.filter(
        (entry) => entry.type === 'FORM_BROKEN' && entry.targetId === imp.instanceId,
      ),
    ).toHaveLength(1)
  })
})

function createBattle(
  deckDefinitionIds: readonly CardId[],
  enemyDefinitions: readonly EnemyDefinition[],
) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinitions,
    deckDefinitionIds,
  })
}

function getEnemy(enemyDefinitionId: string) {
  const enemy = getEnemyDefinition(enemyDefinitionId, gameData)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${enemyDefinitionId}`)
  }

  return enemy
}

function getHandCard(state: CombatState, cardDefinitionId: CardId) {
  const card = state.hand.find((candidate) => candidate.definitionId === cardDefinitionId)

  if (!card) {
    throw new Error(`Missing hand card: ${cardDefinitionId}`)
  }

  return card
}

function withEnemyCurrentForm(
  state: CombatState,
  enemyInstanceId: string,
  currentForm: number,
): CombatState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.instanceId === enemyInstanceId
        ? {
            ...enemy,
            currentForm,
          }
        : enemy,
    ),
  }
}
