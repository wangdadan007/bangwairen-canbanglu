import { describe, expect, it } from 'vitest'
import {
  createInitialBattleState,
  createInitialTutorialRunState,
} from '../core'
import { gameData } from '../data'
import { createFirstRunGuidance } from '../ui/pages/firstRunGuidance'

describe('T56 first run guidance', () => {
  it('explains the first fight with plain terms and project terminology', () => {
    const run = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      ['encounter_tutorial_paper_wraith'],
      undefined,
      gameData.artifacts,
    )
    const battle = createBattle(run, 'enemy_paper_wraith')
    const guidance = createFirstRunGuidance({
      battle,
      run,
      currentEncounter: getEncounter('encounter_tutorial_paper_wraith'),
      currentRouteFlowKind: 'battle',
      currentRouteNode: getRouteNode('route_node_tutorial_paper_wraith'),
    })

    expect(guidance?.tone).toBe('core')
    expect(guidance?.body).toContain('查明真名（问名）')
    expect(guidance?.terms).toEqual(['形', '问名', '正名', '归册'])
    expect(guidance?.body).not.toMatch(/HP|格挡/)
  })

  it('makes high quality catalogue rewards legible before choosing a card', () => {
    const run = {
      ...createInitialTutorialRunState(
        gameData.tutorialUnlocks,
        ['encounter_tutorial_paper_wraith'],
        undefined,
        gameData.artifacts,
      ),
      pendingReward: {
        encounterId: 'encounter_tutorial_paper_wraith',
        settlement: 'catalogue',
        quality: 'high',
        options: [],
      },
    } as const
    const battle = createBattle(run, 'enemy_paper_wraith')
    const guidance = createFirstRunGuidance({
      battle,
      run,
      currentRouteFlowKind: 'battle',
    })

    expect(guidance?.tone).toBe('reward')
    expect(guidance?.title).toContain('问名')
    expect(guidance?.body).toContain('归册限定牌')
  })

  it('uses the Boss node to surface end pressure guidance', () => {
    const run = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      ['encounter_boss_registry_thief'],
      undefined,
      gameData.artifacts,
    )
    const battle = createBattle(run, 'enemy_registry_thief')
    const guidance = createFirstRunGuidance({
      battle,
      run,
      currentEncounter: getEncounter('encounter_boss_registry_thief'),
      currentRouteFlowKind: 'battle',
      currentRouteNode: getRouteNode('route_node_boss_registry_thief'),
    })

    expect(guidance?.tone).toBe('boss')
    expect(guidance?.body).toContain('断异动')
    expect(guidance?.terms).toContain('Boss')
  })

  it('keeps artifact guidance out of the deck when the player reaches the shop', () => {
    const run = createInitialTutorialRunState(
      gameData.tutorialUnlocks,
      ['encounter_tutorial_paper_wraith'],
      undefined,
      gameData.artifacts,
    )
    const battle = createBattle(run, 'enemy_paper_wraith')
    const guidance = createFirstRunGuidance({
      battle,
      run,
      currentRouteFlowKind: 'shop',
      currentRouteNode: getRouteNode('route_node_first_shop'),
    })

    expect(guidance?.tone).toBe('artifact')
    expect(guidance?.body).toContain('不进牌堆')
    expect(guidance?.terms).toEqual(['买卡', '法宝', '朱批'])
  })
})

function createBattle(run: ReturnType<typeof createInitialTutorialRunState>, enemyId: string) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: getEnemy(enemyId),
    unlocks: run.unlocks,
    deckCards: run.deckCards,
    artifacts: run.artifacts,
  })
}

function getEncounter(id: string) {
  const encounter = gameData.encounters.find((candidate) => candidate.id === id)

  if (!encounter) {
    throw new Error(`Missing encounter ${id}`)
  }

  return encounter
}

function getEnemy(id: string) {
  const enemy = gameData.enemies.find((candidate) => candidate.id === id)

  if (!enemy) {
    throw new Error(`Missing enemy ${id}`)
  }

  return enemy
}

function getRouteNode(id: string) {
  const route = gameData.routes[0]

  if (!route) {
    throw new Error('Missing route')
  }

  const node = route.nodes.find((candidate) => candidate.id === id)

  if (!node) {
    throw new Error(`Missing route node ${id}`)
  }

  return node
}
