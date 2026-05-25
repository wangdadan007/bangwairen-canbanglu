import {
  createTutorialRunSummary,
  getAvailableEventOptions,
  getAvailableRestOptions,
  getAvailableShopItems,
  getCurrentRouteEncounter,
  getCurrentRouteEvent,
  getCurrentRouteFlowKind,
  getCurrentRouteNode,
  getRouteNodeDisplayTendencyIds,
  getRouteSeedKey,
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
  const currentRouteEvent = getCurrentRouteEvent(
    currentRouteNode,
    gameData.events,
    run,
    viewState.route,
  )
  const currentEventOptions = currentRouteEvent
    ? getAvailableEventOptions(currentRouteEvent, run)
    : []
  const currentRestOptions =
    currentRouteFlowKind === 'rest' ? getAvailableRestOptions(run) : []
  const currentShopItems =
    currentRouteFlowKind === 'shop'
      ? getAvailableShopItems(run, gameData.shopItems, gameData.cards, gameData.artifacts, {
          routeNodeId: currentRouteNode?.id,
          routeSeed: getRouteSeedKey(viewState.route),
          routeTendencyIds: currentRouteNode
            ? getRouteNodeDisplayTendencyIds(currentRouteNode, viewState.route)
            : viewState.route.routeTendencyIds,
          incenseSealDefinitions: gameData.incenseSeals,
        })
      : []
  const currentHeading = run.pendingArtifactOffer
    ? '法宝三选一'
    : run.pendingIncenseSealOffer
      ? '香封二选一'
    : currentEncounter
    ? t(currentEncounter.nameKey)
    : currentRouteEvent
      ? t(currentRouteEvent.nameKey)
    : currentRouteFlowKind === 'shop' && currentRouteNode
        ? t(currentRouteNode.nameKey)
        : currentRouteFlowKind === 'rest' && currentRouteNode
          ? t(currentRouteNode.nameKey)
          : currentRouteFlowKind === 'route_selection'
            ? '择路入榜'
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
