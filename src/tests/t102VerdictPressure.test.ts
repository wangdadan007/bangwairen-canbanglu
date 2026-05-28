import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  completeCurrentRouteNode,
  createInitialRouteState,
  createInitialTutorialRunState,
  createTutorialArtifactOfferIfNeeded,
  createTutorialRedInkOffer,
  createTutorialRunSummary,
  getAvailableEventOptions,
  getAvailableRestOptions,
  getCurrentRouteEncounter,
  getCurrentRouteEvent,
  getCurrentRouteFlowKind,
  getCurrentRouteNode,
  getEncounterEnemyDefinitionIds,
  getReachableRouteNodes,
  getRouteBattleEncounterIds,
  getVisibleRedInkOptionsForDeckCard,
  HENGJIAN_ROLE_ID,
  LIANJIN_ROLE_ID,
  resolveTutorialArtifactOffer,
  resolveTutorialEvent,
  resolveTutorialRedInk,
  resolveTutorialRest,
  resolveTutorialReward,
  resolveTutorialVerdict,
  selectReachableRouteNode,
  syncTutorialRunEncounters,
  ZHAOWEI_ROLE_ID,
} from '../core'
import { gameData, getEnemyDefinition } from '../data'
import type {
  CardDefinition,
  EncounterDefinition,
  EnemyDefinition,
  PlayableRoleId,
  RouteDefinition,
  RouteNodeDefinition,
  RouteNodeId,
  RouteState,
  TutorialRunState,
  TutorialVerdictOptionId,
  VictorySettlement,
} from '../types'

describe('T102 verdict pressure statistics', () => {
  it('collects full-route pressure stats for extreme ordinary catalogue strategies', () => {
    const rows = STRATEGY_CASES.flatMap((strategyCase) =>
      ROLE_CASES.flatMap((roleCase) =>
        ROUTE_CASES.map((routeCase, routeIndex) => {
          const result = completePressureRoute({
            route: gameData.routes[0],
            seed: roleCase.seed + routeIndex * 17 + strategyCase.seedOffset,
            roleId: roleCase.roleId,
            chooseRouteNode: createRouteSequenceChooser(routeCase.routeNodeIds),
            strategy: strategyCase.strategy,
          })
          const summary = createTutorialRunSummary(result.run)

          return {
            strategyId: strategyCase.id,
            roleId: roleCase.roleId,
            routeLabel: routeCase.label,
            status: result.run.status,
            completedEncounterCount: summary.completedEncounterCount,
            catalogueCount: summary.catalogueCount,
            vanquishCount: summary.vanquishCount,
            verdictRegisterCount: summary.verdictRegisterCount,
            verdictRedInkCount: summary.verdictRedInkCount,
            verdictEraseCount: summary.verdictEraseCount,
            commonRegisterCount: result.run.verdict.registerEntries.filter(
              (entry) => entry.registerRuleId === 'register_common_docket',
            ).length,
            dedicatedRegisterCount: result.run.verdict.registerEntries.filter(
              (entry) => entry.registerRuleId !== 'register_common_docket',
            ).length,
            redInkAppliedCount: summary.redInkAppliedCount,
            redInkSkippedCount: summary.redInkSkippedCount,
            redInkTargetableRemainingCount: countRedInkTargetableCards(result.run),
            deckSize: summary.deckSize,
            ink: summary.ink,
            doom: summary.doom,
            fracture: summary.fracture,
            bossSettlement: summary.bossSettlement,
            registryThiefSealed: summary.registryThiefSealed,
          }
        }),
      ),
    )
    const report = STRATEGY_CASES.map((strategyCase) => {
      const strategyRows = rows.filter((row) => row.strategyId === strategyCase.id)

      return {
        strategyId: strategyCase.id,
        runs: strategyRows.length,
        completeRuns: strategyRows.filter((row) => row.status === 'complete').length,
        catalogueRange: range(strategyRows.map((row) => row.catalogueCount)),
        vanquishRange: range(strategyRows.map((row) => row.vanquishCount)),
        registerRange: range(strategyRows.map((row) => row.verdictRegisterCount)),
        dedicatedRegisterRange: range(strategyRows.map((row) => row.dedicatedRegisterCount)),
        commonRegisterMax: max(strategyRows.map((row) => row.commonRegisterCount)),
        verdictRedInkRange: range(strategyRows.map((row) => row.verdictRedInkCount)),
        verdictEraseRange: range(strategyRows.map((row) => row.verdictEraseCount)),
        redInkAppliedRange: range(strategyRows.map((row) => row.redInkAppliedCount)),
        redInkSkippedRange: range(strategyRows.map((row) => row.redInkSkippedCount)),
        redInkTargetableRemainingRange: range(
          strategyRows.map((row) => row.redInkTargetableRemainingCount),
        ),
        deckSizeRange: range(strategyRows.map((row) => row.deckSize)),
        inkRange: range(strategyRows.map((row) => row.ink)),
        doomRange: range(strategyRows.map((row) => row.doom)),
        fractureRange: range(strategyRows.map((row) => row.fracture)),
        registryThiefSealedRuns: strategyRows.filter((row) => row.registryThiefSealed).length,
      }
    })

    // Set T102_PRESSURE_REPORT=1 when refreshing the QA table from test output.
    if (getTestEnv().T102_PRESSURE_REPORT === '1') {
      console.info('T102_VERDICT_PRESSURE_STATS', JSON.stringify(report, null, 2))
    }

    expect(rows).toHaveLength(STRATEGY_CASES.length * ROLE_CASES.length * ROUTE_CASES.length)
    expect(rows.every((row) => row.status === 'complete')).toBe(true)
    expect(max(rows.map((row) => row.commonRegisterCount))).toBe(0)

    const pureVanquishRows = rows.filter((row) => row.strategyId === 'pure_vanquish')
    expect(max(pureVanquishRows.map((row) => row.catalogueCount))).toBe(0)
    expect(max(pureVanquishRows.map((row) => row.verdictRegisterCount))).toBe(0)
    expect(max(pureVanquishRows.map((row) => row.verdictRedInkCount))).toBe(0)
    expect(max(pureVanquishRows.map((row) => row.verdictEraseCount))).toBe(0)

    const redInkRows = rows.filter((row) => row.strategyId === 'all_catalogue_red_ink')
    expect(min(redInkRows.map((row) => row.verdictRedInkCount))).toBeGreaterThanOrEqual(5)
    expect(max(redInkRows.map((row) => row.verdictRedInkCount))).toBeLessThanOrEqual(7)
    expect(max(redInkRows.map((row) => row.verdictEraseCount))).toBe(0)

    const eraseSeverNameRows = rows.filter(
      (row) => row.strategyId === 'all_catalogue_erase_sever_name',
    )
    expect(min(eraseSeverNameRows.map((row) => row.verdictEraseCount))).toBeGreaterThanOrEqual(5)
    expect(max(eraseSeverNameRows.map((row) => row.verdictRedInkCount))).toBe(0)
    expect(
      eraseSeverNameRows.every((row) => row.fracture >= row.verdictEraseCount),
    ).toBe(true)

    const eraseInkRows = rows.filter((row) => row.strategyId === 'all_catalogue_erase_gain_ink')
    expect(min(eraseInkRows.map((row) => row.verdictEraseCount))).toBeGreaterThanOrEqual(4)
    expect(max(eraseInkRows.map((row) => row.verdictRedInkCount))).toBe(0)
    expect(min(eraseInkRows.map((row) => row.ink))).toBeGreaterThanOrEqual(9)
  })
})

const ROLE_CASES: readonly {
  readonly roleId: PlayableRoleId
  readonly seed: number
}[] = [
  { roleId: HENGJIAN_ROLE_ID, seed: 101 },
  { roleId: ZHAOWEI_ROLE_ID, seed: 211 },
  { roleId: LIANJIN_ROLE_ID, seed: 307 },
]

const ROUTE_CASES: readonly {
  readonly label: string
  readonly routeNodeIds: readonly RouteNodeId[]
}[] = [
  {
    label: 'steady-shop',
    routeNodeIds: ['route_node_unlit_temple_warden', 'route_node_first_shop'],
  },
  {
    label: 'steady-rest',
    routeNodeIds: ['route_node_unlit_temple_warden', 'route_node_rest_site'],
  },
  {
    label: 'catalogue-double-elite',
    routeNodeIds: ['route_node_first_elite', 'route_node_second_elite'],
  },
  {
    label: 'catalogue-event',
    routeNodeIds: ['route_node_first_elite', 'route_node_mid_event'],
  },
  {
    label: 'fracture-event',
    routeNodeIds: ['route_node_fracture_fortune_breaker', 'route_node_first_event'],
  },
  {
    label: 'fracture-shop',
    routeNodeIds: ['route_node_fracture_fortune_breaker', 'route_node_late_scroll_stuffer_clerk'],
  },
]

type PressureStrategy =
  | 'pure_vanquish'
  | 'mixed_catalogue'
  | 'all_catalogue_red_ink'
  | 'all_catalogue_erase_sever_name'
  | 'all_catalogue_erase_gain_ink'

const STRATEGY_CASES: readonly {
  readonly id: PressureStrategy
  readonly strategy: PressureStrategy
  readonly seedOffset: number
}[] = [
  { id: 'pure_vanquish', strategy: 'pure_vanquish', seedOffset: 0 },
  { id: 'mixed_catalogue', strategy: 'mixed_catalogue', seedOffset: 1000 },
  { id: 'all_catalogue_red_ink', strategy: 'all_catalogue_red_ink', seedOffset: 2000 },
  {
    id: 'all_catalogue_erase_sever_name',
    strategy: 'all_catalogue_erase_sever_name',
    seedOffset: 3000,
  },
  {
    id: 'all_catalogue_erase_gain_ink',
    strategy: 'all_catalogue_erase_gain_ink',
    seedOffset: 4000,
  },
]

function completePressureRoute({
  route,
  seed,
  roleId,
  chooseRouteNode,
  strategy,
}: {
  readonly route: RouteDefinition
  readonly seed: number
  readonly roleId: PlayableRoleId
  readonly chooseRouteNode: (nodes: readonly RouteNodeDefinition[], context: RouteChoiceContext) => RouteNodeId
  readonly strategy: PressureStrategy
}) {
  let routeState = createInitialRouteState(route, seed)
  let run = createInitialTutorialRunState(
    gameData.tutorialUnlocks,
    getRouteBattleEncounterIds(route, routeState),
    undefined,
    gameData.artifacts,
    roleId,
  )
  run = resolvePendingRunChoices(run, routeState, strategy)
  let battleIndex = 0
  let routeChoiceIndex = 0

  while (getCurrentRouteFlowKind(route, routeState) !== 'complete') {
    const flowKind = getCurrentRouteFlowKind(route, routeState)
    const node = getCurrentRouteNode(route, routeState)

    if (flowKind === 'route_selection') {
      const reachableNodes = getReachableRouteNodes(route, routeState)
      const selectedNodeId = chooseRouteNode(reachableNodes, {
        routeState,
        run,
        routeChoiceIndex,
      })

      routeState = selectReachableRouteNode(route, routeState, selectedNodeId)
      run = syncTutorialRunEncounters(run, getRouteBattleEncounterIds(route, routeState))
      routeChoiceIndex += 1
      continue
    }

    if (flowKind === 'battle') {
      const encounter = getCurrentRouteEncounter(route, routeState, gameData.encounters)

      if (!encounter) {
        throw new Error('Missing route encounter during T102 pressure test')
      }

      const primaryEnemy = getPrimaryEnemyForEncounter(encounter)
      const settlement = choosePressureSettlement(strategy, encounter, primaryEnemy, battleIndex)
      run = advanceTutorialRun(
        run,
        gameData.encounters,
        gameData.tutorialUnlocks,
        settlement,
        gameData.cards,
        settlement === 'catalogue'
          ? {
              enemyDefinitionId: primaryEnemy.id,
              enemyNameKey: primaryEnemy.nameKey,
              revealedNameKeys: primaryEnemy.nameSlotDefinitions?.map((slot) => slot.nameKey) ?? [],
            }
          : undefined,
        undefined,
        run.resources,
      )
      routeState = completeCurrentRouteNode(route, routeState)
      run = resolvePendingRunChoices(run, routeState, strategy)
      battleIndex += 1
      continue
    }

    if (flowKind === 'event') {
      const event = getCurrentRouteEvent(node, gameData.events, run, routeState)

      if (event) {
        const option = getAvailableEventOptions(event, run)[0]

        if (!option) {
          throw new Error(`No event option available during T102 pressure test: ${event.id}`)
        }

        run = resolveTutorialEvent(run, event, option.id)
      }

      routeState = completeCurrentRouteNode(route, routeState)
      run = resolvePendingRunChoices(run, routeState, strategy)
      continue
    }

    if (flowKind === 'rest') {
      const restOptions = getAvailableRestOptions(run)
      const option =
        run.resources.ink >= 1
          ? restOptions.find((candidate) => candidate.id === 'red_ink_service')
          : undefined
      const fallbackOption =
        option ?? restOptions.find((candidate) => candidate.id !== 'red_ink_service')

      if (!fallbackOption) {
        throw new Error('No rest option available during T102 pressure test')
      }

      run = resolveTutorialRest(run, {
        optionId: fallbackOption.id,
        deckCardId: fallbackOption.id === 'remove_card' ? run.deckCards[0]?.id : undefined,
        routeNodeId: node?.id,
      })
      routeState = completeCurrentRouteNode(route, routeState)
      run = resolvePendingRunChoices(run, routeState, strategy)
      continue
    }

    routeState = completeCurrentRouteNode(route, routeState)
  }

  return {
    route: routeState,
    run,
  }
}

interface RouteChoiceContext {
  readonly routeState: RouteState
  readonly run: TutorialRunState
  readonly routeChoiceIndex: number
}

function createRouteSequenceChooser(routeNodeIds: readonly RouteNodeId[]) {
  let nextSelectionIndex = 0

  return (nodes: readonly RouteNodeDefinition[]) => {
    const expectedNodeId = routeNodeIds[nextSelectionIndex]
    const selectedNode =
      nodes.find((node) => node.id === expectedNodeId) ??
      nodes.find((node) => routeNodeIds.includes(node.id)) ??
      nodes[0]

    if (selectedNode?.id === expectedNodeId) {
      nextSelectionIndex += 1
    }

    if (!selectedNode) {
      throw new Error('No route node available in T102 pressure chooser')
    }

    return selectedNode.id
  }
}

function choosePressureSettlement(
  strategy: PressureStrategy,
  _encounter: EncounterDefinition,
  primaryEnemy: EnemyDefinition,
  battleIndex: number,
): VictorySettlement {
  if (strategy === 'pure_vanquish') {
    return 'vanquish'
  }

  const canCatalogue = (primaryEnemy.nameSlotDefinitions?.length ?? 0) > 0

  if (!canCatalogue) {
    return 'vanquish'
  }

  if (strategy === 'mixed_catalogue') {
    return battleIndex % 2 === 0 ? 'catalogue' : 'vanquish'
  }

  return 'catalogue'
}

function resolvePendingRunChoices(
  run: TutorialRunState,
  routeState: RouteState,
  strategy: PressureStrategy,
): TutorialRunState {
  let nextRun = createTutorialArtifactOfferIfNeeded(run, gameData.artifacts, {
    routeTendencyIds: routeState.routeTendencyIds,
  })

  for (let index = 0; index < 24; index += 1) {
    if (nextRun.pendingVerdict) {
      const preferredVerdictOption = choosePressureVerdictOption(nextRun.pendingVerdict, strategy)

      if (!preferredVerdictOption) {
        throw new Error(`No verdict option available during T102 pressure test: ${nextRun.pendingVerdict.id}`)
      }

      nextRun = resolveTutorialVerdict(nextRun, preferredVerdictOption)
      continue
    }

    if (nextRun.pendingRedInk) {
      nextRun = resolveFirstVisibleRedInk(nextRun)
      continue
    }

    if (nextRun.pendingReward) {
      nextRun = resolveTutorialReward(nextRun)
      continue
    }

    if (nextRun.pendingArtifactOffer) {
      const artifactDefinitionId = nextRun.pendingArtifactOffer.options[0]?.artifactDefinitionId

      if (!artifactDefinitionId) {
        throw new Error(`No artifact option available during T102 pressure test: ${nextRun.pendingArtifactOffer.id}`)
      }

      nextRun = resolveTutorialArtifactOffer(nextRun, artifactDefinitionId, gameData.artifacts)
      continue
    }

    const offeredRun = createTutorialArtifactOfferIfNeeded(nextRun, gameData.artifacts, {
      routeTendencyIds: routeState.routeTendencyIds,
    })

    if (!offeredRun.pendingArtifactOffer) {
      return offeredRun
    }

    nextRun = offeredRun
  }

  throw new Error('Too many pending choices during T102 pressure test')
}

function choosePressureVerdictOption(
  offer: NonNullable<TutorialRunState['pendingVerdict']>,
  strategy: PressureStrategy,
): TutorialVerdictOptionId | undefined {
  const registerOptionId = offer.options.find((option) => option.id === 'register')?.id

  if (registerOptionId) {
    return registerOptionId
  }

  if (strategy === 'all_catalogue_erase_sever_name') {
    return (
      offer.options.find((option) => option.id === 'erase')?.id ??
      offer.options.find((option) => option.choiceId === 'erase')?.id ??
      offer.options[0]?.id
    )
  }

  if (strategy === 'all_catalogue_erase_gain_ink') {
    return (
      offer.options.find((option) => option.id === 'erase_gain_ink')?.id ??
      offer.options.find((option) => option.choiceId === 'erase')?.id ??
      offer.options[0]?.id
    )
  }

  return (
    offer.options.find((option) => option.id === 'red_ink')?.id ??
    offer.options.find((option) => option.choiceId === 'erase')?.id ??
    offer.options[0]?.id
  )
}

function resolveFirstVisibleRedInk(run: TutorialRunState): TutorialRunState {
  const offer = run.pendingRedInk

  if (!offer) {
    return run
  }

  for (const deckCard of run.deckCards) {
    const cardDefinition = getCardDefinition(deckCard.definitionId)
    const option = getVisibleRedInkOptionsForDeckCard(offer, deckCard, cardDefinition)[0]

    if (option) {
      return resolveTutorialRedInk(run, {
        deckCardId: deckCard.id,
        annotationId: option.id,
        cardDefinitions: gameData.cards,
      })
    }
  }

  return resolveTutorialRedInk(run)
}

function countRedInkTargetableCards(run: TutorialRunState) {
  const offer = createTutorialRedInkOffer(run, {
    routeTendencyIds: [],
  })

  return run.deckCards.filter((deckCard) =>
    getVisibleRedInkOptionsForDeckCard(offer, deckCard, getCardDefinition(deckCard.definitionId))
      .length > 0,
  ).length
}

function getCardDefinition(cardDefinitionId: string): CardDefinition | undefined {
  return gameData.cards.find((definition) => definition.id === cardDefinitionId)
}

function getPrimaryEnemyForEncounter(encounter: EncounterDefinition) {
  const primaryEnemyId = getEncounterEnemyDefinitionIds(encounter)[0]
  const enemy = getEnemyDefinition(primaryEnemyId, gameData)

  if (!enemy) {
    throw new Error(`Missing primary enemy for encounter: ${primaryEnemyId}`)
  }

  return enemy
}

function min(values: readonly number[]) {
  return Math.min(...values)
}

function max(values: readonly number[]) {
  return Math.max(...values)
}

function range(values: readonly number[]) {
  return {
    min: min(values),
    max: max(values),
  }
}

function getTestEnv() {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  )
}
