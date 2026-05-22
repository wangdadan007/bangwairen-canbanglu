import {
  REGISTRY_THIEF_BOSS_ENEMY_ID,
  REGISTRY_THIEF_FRACTURE_INTENT_ID,
} from './bossRoutePressureResolver'
import { DEFAULT_HAND_DRAW, type OpeningRiskLogRecord } from '../battle/battleState'
import type { CardId, EnemyDefinition, TutorialResourceState } from '../../types'

export const DOOM_ASH_CARD_ID: CardId = 'card_doom_ash'
export const FOULED_SCROLL_CARD_ID: CardId = 'card_fouled_scroll'
export const DOOM_DRAW_PENALTY_MINIMUM_DRAW = 3

export interface ResolveBattleStartRiskInput {
  readonly resources: TutorialResourceState
  readonly enemyDefinitions: readonly EnemyDefinition[]
  readonly initialEnemyIntentIds?: Readonly<Record<string, string>>
  readonly defaultDrawCount?: number
}

export interface BattleStartRiskResolution {
  readonly openingDrawCount: number
  readonly openingIncensePenalty: number
  readonly openingAskNamePenalty: number
  readonly extraHandDefinitionIds: readonly CardId[]
  readonly extraDrawPileDefinitionIds: readonly CardId[]
  readonly initialEnemyIntentIds: Readonly<Record<string, string>>
  readonly openingRiskLogRecords: readonly OpeningRiskLogRecord[]
}

export function resolveBattleStartRisk(
  input: ResolveBattleStartRiskInput,
): BattleStartRiskResolution {
  const defaultDrawCount = input.defaultDrawCount ?? DEFAULT_HAND_DRAW
  const enemyDefinitions = input.enemyDefinitions
  const openingRiskLogRecords: OpeningRiskLogRecord[] = []
  let openingDrawCount = defaultDrawCount
  let openingIncensePenalty = 0
  let openingAskNamePenalty = 0
  let extraHandDefinitionIds: CardId[] = []
  let extraDrawPileDefinitionIds: CardId[] = []
  let initialEnemyIntentIds: Record<string, string> = {
    ...(input.initialEnemyIntentIds ?? {}),
  }

  const eliteOrBossEnemy = enemyDefinitions.find((enemy) =>
    enemy.tier === 'elite' || enemy.tier === 'boss',
  )
  const bossEnemy = enemyDefinitions.find((enemy) => enemy.tier === 'boss')
  const isOrdinaryBattle = enemyDefinitions.every(
    (enemy) => enemy.tier === 'minion' || enemy.tier === 'normal' || enemy.tier === 'key_normal',
  )

  if (input.resources.doom >= 5) {
    if (eliteOrBossEnemy) {
      const abnormalIntentId = getFirstAbnormalIntentId(eliteOrBossEnemy)

      if (abnormalIntentId) {
        initialEnemyIntentIds = {
          ...initialEnemyIntentIds,
          [eliteOrBossEnemy.id]: abnormalIntentId,
        }
      }

      openingRiskLogRecords.push({
        resource: 'doom',
        threshold: 5,
        stateLabel: '劫满',
        result: 'elite_boss_abnormal',
        amount: 1,
        enemyDefinitionId: eliteOrBossEnemy.id,
        intentId: abnormalIntentId,
      })
    } else {
      openingRiskLogRecords.push({
        resource: 'doom',
        threshold: 5,
        stateLabel: '劫满',
        result: 'record_only',
      })
    }
  } else if (input.resources.doom >= 4) {
    extraHandDefinitionIds = [...extraHandDefinitionIds, DOOM_ASH_CARD_ID]
    openingRiskLogRecords.push({
      resource: 'doom',
      threshold: 4,
      stateLabel: '劫火缠身',
      result: 'doom_ash',
      amount: 1,
      cardDefinitionId: DOOM_ASH_CARD_ID,
    })
  } else if (input.resources.doom >= 3) {
    openingIncensePenalty = 1
    openingRiskLogRecords.push({
      resource: 'doom',
      threshold: 3,
      stateLabel: '劫压',
      result: 'incense_penalty',
      amount: 1,
    })
  } else if (input.resources.doom >= 2) {
    openingDrawCount = Math.max(DOOM_DRAW_PENALTY_MINIMUM_DRAW, defaultDrawCount - 1)
    openingRiskLogRecords.push({
      resource: 'doom',
      threshold: 2,
      stateLabel: '债起',
      result: 'draw_penalty',
      amount: defaultDrawCount - openingDrawCount,
    })
  } else if (input.resources.doom >= 0) {
    openingRiskLogRecords.push({
      resource: 'doom',
      threshold: 0,
      stateLabel: '无碍',
      result: 'record_only',
    })
  }

  if (input.resources.fracture >= 5) {
    openingRiskLogRecords.push({
      resource: 'fracture',
      threshold: 5,
      stateLabel: '大裂',
      result: 'terminal_marker',
    })
  }

  if (input.resources.fracture >= 4 && bossEnemy) {
    initialEnemyIntentIds = {
      ...initialEnemyIntentIds,
      [REGISTRY_THIEF_BOSS_ENEMY_ID]: REGISTRY_THIEF_FRACTURE_INTENT_ID,
    }
    openingRiskLogRecords.push({
      resource: 'fracture',
      threshold: 4,
      stateLabel: '残榜反噬',
      result: 'boss_high_fracture',
      enemyDefinitionId: bossEnemy.id,
      intentId: REGISTRY_THIEF_FRACTURE_INTENT_ID,
    })
  } else if (input.resources.fracture >= 3 && eliteOrBossEnemy) {
    openingAskNamePenalty = 1
    openingRiskLogRecords.push({
      resource: 'fracture',
      threshold: 3,
      stateLabel: '名籍松动',
      result: 'ask_name_penalty',
      amount: 1,
      enemyDefinitionId: eliteOrBossEnemy.id,
    })
  } else if (input.resources.fracture >= 2 && isOrdinaryBattle) {
    extraDrawPileDefinitionIds = [...extraDrawPileDefinitionIds, FOULED_SCROLL_CARD_ID]
    openingRiskLogRecords.push({
      resource: 'fracture',
      threshold: 2,
      stateLabel: '裂纹外张',
      result: 'fouled_scroll',
      amount: 1,
      cardDefinitionId: FOULED_SCROLL_CARD_ID,
    })
  } else if (input.resources.fracture >= 1) {
    openingRiskLogRecords.push({
      resource: 'fracture',
      threshold: 1,
      stateLabel: '初裂',
      result: 'record_only',
    })
  } else {
    openingRiskLogRecords.push({
      resource: 'fracture',
      threshold: 0,
      stateLabel: '稳榜',
      result: 'record_only',
    })
  }

  return {
    openingDrawCount,
    openingIncensePenalty,
    openingAskNamePenalty,
    extraHandDefinitionIds,
    extraDrawPileDefinitionIds,
    initialEnemyIntentIds,
    openingRiskLogRecords,
  }
}

export function isHeavyFractureEnding(resources: TutorialResourceState) {
  return resources.fracture >= 5
}

function getFirstAbnormalIntentId(enemy: EnemyDefinition) {
  return enemy.intents.find((intent) => intent.kind === 'abnormal_move')?.id
}
