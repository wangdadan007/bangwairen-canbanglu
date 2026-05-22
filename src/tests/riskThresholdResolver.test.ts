import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  createInitialTutorialRunState,
  createTutorialRunSummary,
  DOOM_ASH_CARD_ID,
  FOULED_SCROLL_CARD_ID,
  resolveBattleStartRisk,
  resolveAskName,
} from '../core'
import { getEnemyDefinition, gameData } from '../data'

describe('T68 risk threshold resolver', () => {
  it('settles only the highest doom threshold at battle start', () => {
    const normalEnemy = requireEnemy('enemy_paper_wraith')
    const eliteEnemy = requireEnemy('enemy_fire_fleeing_name')

    const debt = resolveBattleStartRisk({
      resources: { ink: 0, doom: 2, fracture: 0 },
      enemyDefinitions: [normalEnemy],
    })
    const pressure = resolveBattleStartRisk({
      resources: { ink: 0, doom: 3, fracture: 0 },
      enemyDefinitions: [normalEnemy],
    })
    const fire = resolveBattleStartRisk({
      resources: { ink: 0, doom: 4, fracture: 0 },
      enemyDefinitions: [normalEnemy],
    })
    const full = resolveBattleStartRisk({
      resources: { ink: 0, doom: 5, fracture: 0 },
      enemyDefinitions: [eliteEnemy],
    })

    expect(debt.openingDrawCount).toBe(4)
    expect(debt.openingRiskLogRecords.find((record) => record.resource === 'doom')).toMatchObject({
      threshold: 2,
      result: 'draw_penalty',
    })
    expect(pressure.openingIncensePenalty).toBe(1)
    expect(pressure.extraHandDefinitionIds).toEqual([])
    expect(fire.extraHandDefinitionIds).toEqual([DOOM_ASH_CARD_ID])
    expect(full.initialEnemyIntentIds[eliteEnemy.id]).toBe(
      'intent_fire_fleeing_name_burn_name',
    )
    expect(full.extraHandDefinitionIds).toEqual([])
  })

  it('applies doom opening penalties to concrete battle state', () => {
    const enemy = requireEnemy('enemy_paper_wraith')
    const debt = resolveBattleStartRisk({
      resources: { ink: 0, doom: 2, fracture: 0 },
      enemyDefinitions: [enemy],
    })
    const fire = resolveBattleStartRisk({
      resources: { ink: 0, doom: 4, fracture: 0 },
      enemyDefinitions: [enemy],
    })
    const debtBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: enemy,
      resources: { ink: 0, doom: 2, fracture: 0 },
      openingDrawCount: debt.openingDrawCount,
      openingRiskLogRecords: debt.openingRiskLogRecords,
    })
    const fireBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: enemy,
      resources: { ink: 0, doom: 4, fracture: 0 },
      extraHandDefinitionIds: fire.extraHandDefinitionIds,
      openingRiskLogRecords: fire.openingRiskLogRecords,
    })

    expect(debtBattle.hand).toHaveLength(4)
    expect(debtBattle.actionLog.some((entry) => entry.type === 'RISK_THRESHOLD_APPLIED')).toBe(true)
    expect(fireBattle.hand.some((card) => card.definitionId === DOOM_ASH_CARD_ID)).toBe(true)
  })

  it('applies fracture thresholds by encounter context', () => {
    const normalEnemy = requireEnemy('enemy_paper_wraith')
    const eliteEnemy = requireEnemy('enemy_fire_fleeing_name')
    const bossEnemy = requireEnemy('enemy_registry_thief')

    const crackedNormal = resolveBattleStartRisk({
      resources: { ink: 0, doom: 0, fracture: 2 },
      enemyDefinitions: [normalEnemy],
    })
    const looseElite = resolveBattleStartRisk({
      resources: { ink: 0, doom: 0, fracture: 3 },
      enemyDefinitions: [eliteEnemy],
    })
    const highBoss = resolveBattleStartRisk({
      resources: { ink: 0, doom: 0, fracture: 4 },
      enemyDefinitions: [bossEnemy],
    })

    expect(crackedNormal.extraDrawPileDefinitionIds).toEqual([FOULED_SCROLL_CARD_ID])
    expect(looseElite.openingAskNamePenalty).toBe(1)
    expect(highBoss.initialEnemyIntentIds.enemy_registry_thief).toBe(
      'intent_registry_thief_tear_registry',
    )

    const looseBattle = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: eliteEnemy,
      resources: { ink: 0, doom: 0, fracture: 3 },
      openingAskNamePenalty: looseElite.openingAskNamePenalty,
      openingRiskLogRecords: looseElite.openingRiskLogRecords,
    })
    const afterAsk = resolveAskName(looseBattle, {
      sourceId: 'player',
      targetEnemyInstanceId: looseBattle.enemies[0].instanceId,
      amount: 1,
    })

    expect(afterAsk.nextAskNamePenalty).toBe(0)
    expect(afterAsk.enemies[0].nameSlots.every((slot) => !slot.isRevealed)).toBe(true)
    expect(afterAsk.actionLog[afterAsk.actionLog.length - 1]?.payload.askNamePenalty).toBe(1)
  })

  it('marks terminal summaries as heavy fracture endings', () => {
    const run = {
      ...createInitialTutorialRunState(gameData.tutorialUnlocks),
      resources: {
        ink: 0,
        doom: 0,
        fracture: 5,
      },
    }

    expect(createTutorialRunSummary(run).heavyFractureEnding).toBe(true)
  })
})

function requireEnemy(enemyDefinitionId: string) {
  const enemy = getEnemyDefinition(enemyDefinitionId, gameData)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${enemyDefinitionId}`)
  }

  return enemy
}
