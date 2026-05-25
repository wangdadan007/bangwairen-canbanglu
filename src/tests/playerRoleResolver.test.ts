import { describe, expect, it } from 'vitest'
import {
  createInitialArtifactCollection,
  createInitialBattleState,
  createInitialTutorialRunState,
  createTutorialArtifactOfferIfNeeded,
  HENGJIAN_ROLE_ID,
  LIANJIN_ROLE_ID,
  PLAYABLE_ROLE_DEFINITIONS,
  RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
  reduceBattleState,
  ZHAOWEI_ROLE_ID,
  type BattleReducerContext,
} from '../core'
import { gameData } from '../data'
import type { CardInstance } from '../types'

const battleContext: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

describe('T62 playable roles', () => {
  it('starts each first-chapter role with distinct form, deck, and fixed artifact', () => {
    const expectations = [
      {
        roleId: HENGJIAN_ROLE_ID,
        maxForm: 72,
        starterArtifactId: 'artifact_whip_fragment',
        deckSize: 12,
        askNameCount: 2,
        cutSupplyCount: 1,
        zhuFuCount: 4,
      },
      {
        roleId: ZHAOWEI_ROLE_ID,
        maxForm: 64,
        starterArtifactId: 'artifact_bone_mirror',
        deckSize: 12,
        askNameCount: 3,
        cutSupplyCount: 1,
        zhuFuCount: 3,
      },
      {
        roleId: LIANJIN_ROLE_ID,
        maxForm: 78,
        starterArtifactId: RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
        deckSize: 12,
        askNameCount: 1,
        cutSupplyCount: 1,
        zhuFuCount: 5,
      },
    ] as const

    expect(PLAYABLE_ROLE_DEFINITIONS).toHaveLength(3)

    for (const expectation of expectations) {
      const run = createInitialTutorialRunState(
        gameData.tutorialUnlocks,
        undefined,
        undefined,
        gameData.artifacts,
        expectation.roleId,
      )
      const starterOfferRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts)

      expect(run.roleId).toBe(expectation.roleId)
      expect(run.playerForm).toEqual({
        current: expectation.maxForm,
        max: expectation.maxForm,
      })
      expect(
        run.artifacts.artifacts.map((artifact) => artifact.definitionId),
      ).toEqual([expectation.starterArtifactId])
      expect(starterOfferRun.pendingArtifactOffer).toBeUndefined()
      expect(run.deckDefinitionIds).toHaveLength(expectation.deckSize)
      expect(countCards(run.deckDefinitionIds, 'card_ask_name')).toBe(expectation.askNameCount)
      expect(countCards(run.deckDefinitionIds, 'card_cut_supply_talisman')).toBe(
        expectation.cutSupplyCount,
      )
      expect(countCards(run.deckDefinitionIds, 'card_zhu_fu')).toBe(expectation.zhuFuCount)
    }
  })

  it('lets red sash fire wheel reward the second break-form card of a turn', () => {
    const artifactDefinition = gameData.artifacts.find(
      (artifact) => artifact.id === RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
    )

    if (!artifactDefinition) {
      throw new Error(`Missing artifact definition: ${RED_SASH_FIRE_WHEEL_ARTIFACT_ID}`)
    }

    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_zhu_fu', 'card_zhu_fu'],
      artifacts: createInitialArtifactCollection([artifactDefinition]),
    })
    const firstZhuFu = getHandCard(state.hand, 'card_zhu_fu')
    const afterFirstBreak = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstZhuFu.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const secondZhuFu = getHandCard(afterFirstBreak.hand, 'card_zhu_fu')
    const afterSecondBreak = reduceBattleState(
      afterFirstBreak,
      {
        type: 'PLAY_CARD',
        cardInstanceId: secondZhuFu.instanceId,
        targetEnemyInstanceId: afterFirstBreak.enemies[0].instanceId,
      },
      battleContext,
    )
    const redSashLogs = afterSecondBreak.actionLog.filter(
      (entry) =>
        entry.type === 'ARTIFACT_TRIGGERED' &&
        entry.sourceId === RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
    )

    expect(afterFirstBreak.actionLog.some((entry) => entry.sourceId === RED_SASH_FIRE_WHEEL_ARTIFACT_ID)).toBe(
      false,
    )
    expect(redSashLogs.map((entry) => entry.payload.result)).toEqual(['prepared', 'consumed'])
    expect(redSashLogs[0]?.payload).toEqual(
      expect.objectContaining({
        effectType: 'break_chain_incense_bonus',
        incenseAmount: 1,
        amount: 1,
      }),
    )
    expect(afterSecondBreak.enemies[0].currentForm).toBe(9)
    expect(afterSecondBreak.pendingArtifactBreakShapeBonus).toBeUndefined()
  })

  it('does not count ask-name cards as break-form cards for red sash fire wheel', () => {
    const artifactDefinition = gameData.artifacts.find(
      (artifact) => artifact.id === RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
    )

    if (!artifactDefinition) {
      throw new Error(`Missing artifact definition: ${RED_SASH_FIRE_WHEEL_ARTIFACT_ID}`)
    }

    const state = createInitialBattleState({
      cardDefinitions: gameData.cards,
      enemyDefinition: gameData.enemies[0],
      deckDefinitionIds: ['card_ask_name', 'card_zhu_fu'],
      artifacts: createInitialArtifactCollection([artifactDefinition]),
    })
    const askName = getHandCard(state.hand, 'card_ask_name')
    const afterAskName = reduceBattleState(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: askName.instanceId,
        targetEnemyInstanceId: state.enemies[0].instanceId,
      },
      battleContext,
    )
    const zhuFu = getHandCard(afterAskName.hand, 'card_zhu_fu')
    const afterZhuFu = reduceBattleState(
      afterAskName,
      {
        type: 'PLAY_CARD',
        cardInstanceId: zhuFu.instanceId,
        targetEnemyInstanceId: afterAskName.enemies[0].instanceId,
      },
      battleContext,
    )
    const redSashLogs = afterZhuFu.actionLog.filter(
      (entry) =>
        entry.type === 'ARTIFACT_TRIGGERED' &&
        entry.sourceId === RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
    )

    expect(redSashLogs).toEqual([])
    expect(afterZhuFu.pendingArtifactBreakShapeBonus).toBeUndefined()
  })
})

function countCards(deckDefinitionIds: readonly string[], cardDefinitionId: string) {
  return deckDefinitionIds.filter((candidate) => candidate === cardDefinitionId).length
}

function getHandCard(hand: readonly CardInstance[], cardDefinitionId: string) {
  const card = hand.find((candidate) => candidate.definitionId === cardDefinitionId)

  if (!card) {
    throw new Error(`Missing hand card: ${cardDefinitionId}`)
  }

  return card
}
