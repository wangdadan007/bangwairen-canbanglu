import {
  createTutorialRunSummary,
  getAvailableEventOptions,
  getAvailableRestOptions,
  getAvailableShopItems,
  getCurrentRouteEncounter,
  getCurrentRouteEvent,
  getCurrentRouteFlowKind,
  getCurrentRouteNode,
} from '../../core'
import { gameData } from '../../data'
import { getRunHeadline, t } from './actionLogView'
import { hasPendingRunChoice, tutorialRoute, type TutorialBattleViewState } from './useTutorialRunFlow'

export function selectBattleHudState(viewState: TutorialBattleViewState) {
  const { battle, run } = viewState
  const currentRouteNode = getCurrentRouteNode(tutorialRoute, viewState.route)
  const currentRouteFlowKind = getCurrentRouteFlowKind(tutorialRoute, viewState.route)
  const currentEncounter = hasPendingRunChoice(run)
    ? undefined
    : getCurrentRouteEncounter(tutorialRoute, viewState.route, gameData.encounters)
  const currentRouteEvent = getCurrentRouteEvent(currentRouteNode, gameData.events, run)
  const currentEventOptions = currentRouteEvent
    ? getAvailableEventOptions(currentRouteEvent, run)
    : []
  const currentRestOptions =
    currentRouteFlowKind === 'rest' ? getAvailableRestOptions(run) : []
  const currentShopItems =
    currentRouteFlowKind === 'shop'
      ? getAvailableShopItems(run, gameData.shopItems, gameData.cards, gameData.artifacts)
      : []
  const currentHeading = currentEncounter
    ? t(currentEncounter.nameKey)
    : currentRouteEvent
      ? t(currentRouteEvent.nameKey)
      : currentRouteFlowKind === 'shop' && currentRouteNode
        ? t(currentRouteNode.nameKey)
        : currentRouteFlowKind === 'rest' && currentRouteNode
          ? t(currentRouteNode.nameKey)
          : getRunHeadline(run.status)
  const selectedEnemy = battle.enemies.find(
    (candidate) =>
      candidate.instanceId === viewState.selectedEnemyInstanceId && candidate.currentForm > 0,
  )
  const enemy = currentEncounter
    ? selectedEnemy ?? battle.enemies.find((candidate) => candidate.currentForm > 0)
    : undefined
  const canAct =
    !hasPendingRunChoice(run) &&
    Boolean(currentEncounter) &&
    run.status === 'active' &&
    battle.phase === 'player_turn' &&
    battle.result.status === 'ongoing'

  return {
    currentRouteNode,
    currentRouteFlowKind,
    currentEncounter,
    currentRouteEvent,
    currentEventOptions,
    currentRestOptions,
    currentShopItems,
    currentHeading,
    enemy,
    canAct,
    latestLog: battle.actionLog.slice(-14).reverse(),
    runSummary: createTutorialRunSummary(run),
  }
}
