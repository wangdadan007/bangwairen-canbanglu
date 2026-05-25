import { useEffect, useState } from 'react'
import {
  advanceTutorialRun,
  type ArtifactBacklashRecord,
  type ArtifactBattleProgressInput,
  completeCurrentRouteNode,
  createInitialBattleState,
  createInitialEnemyIntentIdsForRoute,
  createInitialRouteState,
  createInitialTutorialRunState,
  createArtifactOfferAnchorIds,
  createTutorialArtifactOfferIfNeeded,
  DEFAULT_PLAYABLE_ROLE_ID,
  DEFAULT_PLAYER_MAX_FORM,
  failTutorialRun,
  getEncounterEnemyDefinitionIds,
  getCurrentRouteEncounter,
  getCurrentRouteEvent,
  getCurrentRouteNode,
  getRouteBattleEncounterIds,
  getRouteNodeDisplayTendencyIds,
  getRouteSeedKey,
  reduceBattleState,
  reorderPendingTutorialRedInkOffer,
  resolveArtifactBacklashesAtBattleStart,
  resolveBattleStartRisk,
  resolveTutorialArtifactOffer,
  resolveTutorialEvent,
  resolveTutorialIncenseSealOffer,
  resolveTutorialRedInk,
  resolveTutorialRest,
  resolveTutorialReward,
  resolveTutorialShopPurchase,
  resolveTutorialVerdict,
  selectReachableRouteNode,
  syncTutorialRunEncounters,
  type BattleReducerContext,
} from '../../core'
import { gameData } from '../../data'
import type {
  CardDefinition,
  CardId,
  CardInstance,
  CodexRecordEntry,
  CodexRecordState,
  CombatState,
  EncounterDefinition,
  EnemyDefinition,
  EnemyState,
  IncenseSealId,
  IncenseSealInstanceId,
  RedInkAnnotationId,
  RouteDefinition,
  RouteNodeId,
  RouteState,
  RunDeckCard,
  RunDeckCardId,
  SettingsState,
  TutorialPlayerFormState,
  TutorialRestOptionId,
  TutorialRunState,
  TutorialSaveData,
  TutorialVerdictOptionId,
  UnlockState,
} from '../../types'

export interface TutorialBattleViewState {
  readonly run: TutorialRunState
  readonly battle: CombatState
  readonly route: RouteState
  readonly selectedEnemyInstanceId?: string
}

export interface BattleHudProps {
  readonly initialSave?: TutorialSaveData
  readonly codexRecordState?: CodexRecordState
  readonly codexRunRecords?: readonly CodexRecordEntry[]
  readonly newCodexRecords?: readonly CodexRecordEntry[]
  readonly selectedRoleId?: TutorialRunState['roleId']
  readonly settings?: SettingsState
  readonly onSaveChange?: (run: TutorialRunState, route: RouteState) => void
}

const battleContext: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
  incenseSealDefinitions: gameData.incenseSeals,
}

export const enemyDefinitionsById = new Map(gameData.enemies.map((enemy) => [enemy.id, enemy]))
export const artifactDefinitionsById = new Map(
  gameData.artifacts.map((artifact) => [artifact.id, artifact]),
)
export const encounterDefinitionsById = new Map(
  gameData.encounters.map((encounter) => [encounter.id, encounter]),
)
export const tutorialRoute = getTutorialRoute(gameData.routes)

export function useTutorialRunFlow({
  initialSave,
  selectedRoleId = DEFAULT_PLAYABLE_ROLE_ID,
  onSaveChange,
}: Pick<BattleHudProps, 'initialSave' | 'selectedRoleId' | 'onSaveChange'>) {
  const [viewState, setViewState] = useState(() =>
    createInitialTutorialBattleView(initialSave, selectedRoleId),
  )

  useEffect(() => {
    setViewState((current) => reconcileViewStateWithRoute(current))
  }, [])

  useEffect(() => {
    onSaveChange?.(viewState.run, viewState.route)
  }, [onSaveChange, viewState.route, viewState.run])

  function playCard(card: CardInstance) {
    setViewState((current) => {
      const currentEnemy = getSelectedLivingEnemy(current.battle, current.selectedEnemyInstanceId)

      if (
        !currentEnemy ||
        hasPendingRunChoice(current.run) ||
        current.run.status !== 'active' ||
        current.battle.phase !== 'player_turn' ||
        current.battle.result.status !== 'ongoing'
      ) {
        return current
      }

      return {
        ...current,
        battle: reduceBattleState(
          current.battle,
          {
            type: 'PLAY_CARD',
            cardInstanceId: card.instanceId,
            targetEnemyInstanceId: currentEnemy.instanceId,
          },
          battleContext,
        ),
      }
    })
  }

  function selectEnemyTarget(enemyInstanceId: string) {
    setViewState((current) => {
      if (!current.battle.enemies.some(
        (enemy) => enemy.instanceId === enemyInstanceId && enemy.currentForm > 0,
      )) {
        return current
      }

      return {
        ...current,
        selectedEnemyInstanceId: enemyInstanceId,
      }
    })
  }

  function endTurn() {
    setViewState((current) => {
      if (
        hasPendingRunChoice(current.run) ||
        current.run.status !== 'active' ||
        current.battle.phase !== 'player_turn' ||
        current.battle.result.status !== 'ongoing'
      ) {
        return current
      }

      return {
        ...current,
        battle: reduceBattleState(
          current.battle,
          {
            type: 'END_TURN',
          },
          battleContext,
        ),
      }
    })
  }

  function spendInkGuardName() {
    setViewState((current) => {
      const currentEnemy = getSelectedLivingEnemy(current.battle, current.selectedEnemyInstanceId)

      if (
        !currentEnemy ||
        hasPendingRunChoice(current.run) ||
        current.run.status !== 'active' ||
        current.battle.phase !== 'player_turn' ||
        current.battle.result.status !== 'ongoing'
      ) {
        return current
      }

      return {
        ...current,
        battle: reduceBattleState(
          current.battle,
          {
            type: 'SPEND_INK_GUARD_NAME',
            targetEnemyInstanceId: currentEnemy.instanceId,
          },
          battleContext,
        ),
      }
    })
  }

  function spendInkCleanse() {
    setViewState((current) => {
      if (
        hasPendingRunChoice(current.run) ||
        current.run.status !== 'active' ||
        current.battle.phase !== 'player_turn' ||
        current.battle.result.status !== 'ongoing'
      ) {
        return current
      }

      return {
        ...current,
        battle: reduceBattleState(
          current.battle,
          {
            type: 'SPEND_INK_CLEANSE',
          },
          battleContext,
        ),
      }
    })
  }

  function activateIncenseSeal(incenseSealInstanceId: IncenseSealInstanceId) {
    setViewState((current) => {
      const currentEnemy = getSelectedLivingEnemy(current.battle, current.selectedEnemyInstanceId)

      if (
        hasPendingRunChoice(current.run) ||
        current.run.status !== 'active' ||
        current.battle.phase !== 'player_turn' ||
        current.battle.result.status !== 'ongoing'
      ) {
        return current
      }

      return {
        ...current,
        battle: reduceBattleState(
          current.battle,
          {
            type: 'USE_INCENSE_SEAL',
            incenseSealInstanceId,
            targetEnemyInstanceId: currentEnemy?.instanceId,
          },
          battleContext,
        ),
      }
    })
  }

  function restartCurrentBattle() {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run)) {
        return current
      }

      const encounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)

      if (!encounter) {
        return createInitialTutorialBattleView(undefined, current.run.roleId ?? selectedRoleId)
      }

      const nextBattleView = createBattleForEncounter(encounter, current.run, current.route)

      return {
        ...current,
        run: nextBattleView.run,
        battle: nextBattleView.battle,
        selectedEnemyInstanceId: getFirstLivingEnemy(nextBattleView.battle)?.instanceId,
      }
    })
  }

  function restartTutorialRun() {
    setViewState((current) =>
      createInitialTutorialBattleView(undefined, current.run.roleId ?? selectedRoleId),
    )
  }

  function abandonTutorialRun() {
    setViewState((current) => ({
      ...current,
      run: failTutorialRun(current.run, 'abandoned'),
    }))
  }

  function settleBattleDefeat() {
    setViewState((current) => ({
      ...current,
      run: failTutorialRun(
        {
          ...current.run,
          playerForm: getPersistentBattlePlayerForm(current.battle),
        },
        'battle_defeat',
      ),
    }))
  }

  function advanceAfterVictory() {
    setViewState((current) => {
      const result = current.battle.result
      const encounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)

      if (
        hasPendingRunChoice(current.run) ||
        current.run.status !== 'active' ||
        !encounter ||
        result.status !== 'victory'
      ) {
        return current
      }

      const syncedRun = syncRunWithRoute(current.run, current.route)
      const defeatedEnemy = current.battle.enemies.find(
        (candidate) => candidate.instanceId === result.enemyInstanceId,
      )
      const defeatedEnemyDefinition = defeatedEnemy
        ? getEnemyDefinition(defeatedEnemy.definitionId)
        : undefined
      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const advancedRun = advanceTutorialRun(
        syncedRun,
        gameData.encounters,
        gameData.tutorialUnlocks,
        result.settlement,
        gameData.cards,
        defeatedEnemy && defeatedEnemyDefinition
          ? {
              enemyDefinitionId: defeatedEnemy.definitionId,
              enemyNameKey: defeatedEnemyDefinition.nameKey,
              revealedNameKeys: getRevealedNameKeys(defeatedEnemy),
            }
          : undefined,
        defeatedEnemy ? createArtifactBattleProgress(current.battle, defeatedEnemy) : undefined,
        getPersistentBattleResources(current.battle),
        getPersistentBattlePlayerForm(current.battle),
        current.battle.registerEntries,
        current.battle.incenseSeals,
        gameData.incenseSeals,
      )
      const nextRun = createRouteAwareArtifactOffer(advancedRun, nextRoute)

      return {
        run: nextRun,
        battle: current.battle,
        route: nextRoute,
      }
    })
  }

  function chooseReward(cardDefinitionId?: CardId) {
    setViewState((current) => {
      const nextRun = createRouteAwareArtifactOffer(
        resolveTutorialReward(current.run, cardDefinitionId),
        current.route,
      )
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, current.route)
          : undefined

      return {
        ...current,
        run: nextBattleView?.run ?? nextRun,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function chooseIncenseSeal(incenseSealDefinitionId?: IncenseSealId) {
    setViewState((current) => {
      const nextRun = createRouteAwareArtifactOffer(
        resolveTutorialIncenseSealOffer(current.run, incenseSealDefinitionId),
        current.route,
      )
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, current.route)
          : undefined

      return {
        ...current,
        run: nextBattleView?.run ?? nextRun,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function chooseVerdict(choiceId: TutorialVerdictOptionId) {
    setViewState((current) => {
      const nextRun = createRouteAwareArtifactOffer(
        resolveTutorialVerdict(current.run, choiceId),
        current.route,
      )
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, current.route)
          : undefined

      return {
        ...current,
        run: nextBattleView?.run ?? nextRun,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function applyRedInk(deckCardId?: RunDeckCardId, annotationId?: RedInkAnnotationId) {
    setViewState((current) => {
      const nextRun =
        deckCardId && annotationId
          ? createRouteAwareArtifactOffer(
              resolveTutorialRedInk(current.run, {
                deckCardId,
                annotationId,
                cardDefinitions: gameData.cards,
              }),
              current.route,
            )
          : createRouteAwareArtifactOffer(resolveTutorialRedInk(current.run), current.route)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, current.route)
          : undefined

      return {
        ...current,
        run: nextBattleView?.run ?? nextRun,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function chooseEvent(optionId: string) {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run) || current.run.status !== 'active') {
        return current
      }

      const node = getCurrentRouteNode(tutorialRoute, current.route)
      const event = getCurrentRouteEvent(node, gameData.events, current.run, current.route)

      if (!event) {
        return current
      }

      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const nextRun = createRouteAwareArtifactOffer(
        resolveTutorialEvent(current.run, event, optionId),
        nextRoute,
      )
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, nextRoute)
          : undefined

      return {
        run: nextBattleView?.run ?? nextRun,
        route: nextRoute,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function chooseRest(optionId: TutorialRestOptionId, deckCardId?: RunDeckCardId) {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run) || current.run.status !== 'active') {
        return current
      }

      const node = getCurrentRouteNode(tutorialRoute, current.route)

      if (node?.type !== 'rest' || node.isPlaceholder) {
        return current
      }

      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const nextRun = createRouteAwareArtifactOffer(
        resolveTutorialRest(current.run, {
          optionId,
          deckCardId,
          routeNodeId: node.id,
        }),
        nextRoute,
      )
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, nextRoute)
          : undefined

      return {
        run: nextBattleView?.run ?? nextRun,
        route: nextRoute,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function buyShopItem(
    itemId: string,
    deckCardId?: RunDeckCardId,
    replaceIncenseSealInstanceId?: IncenseSealInstanceId,
  ) {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run) || current.run.status !== 'active') {
        return current
      }

      const node = getCurrentRouteNode(tutorialRoute, current.route)

      if (node?.type !== 'shop' || node.isPlaceholder) {
        return current
      }

      return {
        ...current,
        run: resolveTutorialShopPurchase(
          current.run,
          {
            itemId,
            deckCardId,
            replaceIncenseSealInstanceId,
            routeNodeId: node.id,
            routeSeed: getRouteSeedKey(current.route),
            routeTendencyIds: getRouteNodeDisplayTendencyIds(node, current.route),
          },
          gameData.shopItems,
          gameData.cards,
          gameData.artifacts,
          gameData.incenseSeals,
        ),
      }
    })
  }

  function chooseArtifact(artifactDefinitionId: string) {
    setViewState((current) => {
      const nextRun = createRouteAwareArtifactOffer(
        resolveTutorialArtifactOffer(current.run, artifactDefinitionId, gameData.artifacts),
        current.route,
      )
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun, current.route)
          : undefined

      return {
        ...current,
        run: nextBattleView?.run ?? nextRun,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function leaveShop() {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run) || current.run.status !== 'active') {
        return current
      }

      const node = getCurrentRouteNode(tutorialRoute, current.route)

      if (node?.type !== 'shop' || node.isPlaceholder) {
        return current
      }

      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView = nextEncounter
        ? createBattleForEncounter(nextEncounter, current.run, nextRoute)
        : undefined

      return {
        ...current,
        route: nextRoute,
        run: nextBattleView?.run ?? current.run,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function advancePlaceholderNode() {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run) || current.run.status !== 'active') {
        return current
      }

      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView = nextEncounter
        ? createBattleForEncounter(nextEncounter, current.run, nextRoute)
        : undefined

      return {
        ...current,
        route: nextRoute,
        run: nextBattleView?.run ?? current.run,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  function chooseRouteNode(nodeId: RouteNodeId) {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run) || current.run.status !== 'active') {
        return current
      }

      const nextRoute = selectReachableRouteNode(tutorialRoute, current.route, nodeId)
      const syncedRun = syncRunWithRoute(current.run, nextRoute)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView = nextEncounter
        ? createBattleForEncounter(nextEncounter, syncedRun, nextRoute)
        : undefined

      return {
        ...current,
        route: nextRoute,
        run: nextBattleView?.run ?? syncedRun,
        battle: nextBattleView?.battle ?? current.battle,
        selectedEnemyInstanceId: nextBattleView
          ? getFirstLivingEnemy(nextBattleView.battle)?.instanceId
          : current.selectedEnemyInstanceId,
      }
    })
  }

  return {
    viewState,
    actions: {
      playCard,
      selectEnemyTarget,
      endTurn,
      spendInkGuardName,
      spendInkCleanse,
      activateIncenseSeal,
      restartCurrentBattle,
      restartTutorialRun,
      abandonTutorialRun,
      settleBattleDefeat,
      advanceAfterVictory,
      chooseReward,
      chooseIncenseSeal,
      chooseVerdict,
      applyRedInk,
      chooseEvent,
      chooseRest,
      buyShopItem,
      chooseArtifact,
      leaveShop,
      advancePlaceholderNode,
      chooseRouteNode,
    },
  }
}

export function createCardDefinitionMap(cards: readonly CardDefinition[]) {
  return new Map(cards.map((card) => [card.id, card]))
}

export function createCardInstanceMap(cards: readonly CardInstance[]) {
  return new Map(cards.map((card) => [card.instanceId, card]))
}

export function hasPendingRunChoice(run: TutorialRunState) {
  return Boolean(
    run.pendingVerdict ||
      run.pendingRedInk ||
      run.pendingReward ||
      run.pendingIncenseSealOffer ||
      run.pendingArtifactOffer,
  )
}

export function isFinalEncounter(run: TutorialRunState) {
  return run.currentEncounterIndex >= run.encounterIds.length - 1
}

function createBattle(
  enemyDefinitions: readonly EnemyDefinition[],
  unlocks: UnlockState,
  deckCards?: readonly RunDeckCard[],
  maxIncenseBonus = 0,
  playerForm: TutorialPlayerFormState = {
    current: DEFAULT_PLAYER_MAX_FORM,
    max: DEFAULT_PLAYER_MAX_FORM,
  },
  resources = {
    ink: 0,
    doom: 0,
    fracture: 0,
  },
  temporaryResourceDelta = {
    ink: 0,
    doom: 0,
    fracture: 0,
  },
  temporaryPlayerFormDelta = 0,
  artifacts?: TutorialRunState['artifacts'],
  registerEntries: TutorialRunState['verdict']['registerEntries'] = [],
  openingHandDefinitionIds: readonly CardId[] = [],
  extraHandDefinitionIds: readonly CardId[] = [],
  extraDrawPileDefinitionIds: readonly CardId[] = [],
  artifactBacklashRecords: readonly ArtifactBacklashRecord[] = [],
  initialEnemyIntentIds: Readonly<Record<string, string>> = {},
  incenseSeals?: TutorialRunState['incenseSeals'],
  openingIncenseBonus = 0,
  openingIncensePenalty = 0,
  openingDrawCount?: number,
  openingAskNamePenalty = 0,
  openingRiskLogRecords: Parameters<typeof createInitialBattleState>[0]['openingRiskLogRecords'] = [],
) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinitions,
    unlocks,
    deckCards,
    maxIncenseBonus,
    playerCurrentForm: playerForm.current,
    playerMaxForm: playerForm.max,
    resources,
    temporaryResourceDelta,
    temporaryPlayerFormDelta,
    artifacts,
    registerEntries,
    openingHandDefinitionIds,
    extraHandDefinitionIds,
    extraDrawPileDefinitionIds,
    artifactBacklashRecords,
    initialEnemyIntentIds,
    incenseSeals,
    openingIncenseBonus,
    openingIncensePenalty,
    openingDrawCount,
    openingAskNamePenalty,
    openingRiskLogRecords,
  })
}

function createRouteAwareArtifactOffer(run: TutorialRunState, route: RouteState) {
  const runWithRouteAwareRedInk = reorderPendingTutorialRedInkOffer(run, {
    routeTendencyIds: route.routeTendencyIds ?? [],
  })
  const routeTendencyIds = route.routeTendencyIds ?? []

  return createTutorialArtifactOfferIfNeeded(runWithRouteAwareRedInk, gameData.artifacts, {
    routeTendencyIds,
    routeSeed: getRouteSeedKey(route),
    buildAnchorIds: createArtifactOfferAnchorIds(runWithRouteAwareRedInk, routeTendencyIds),
  })
}

function createInitialTutorialBattleView(
  save?: TutorialSaveData,
  selectedRoleId: TutorialRunState['roleId'] = DEFAULT_PLAYABLE_ROLE_ID,
): TutorialBattleViewState {
  const route =
    save?.route.routeId === tutorialRoute.id ? save.route : createInitialRouteState(tutorialRoute)
  const loadedRun =
    save?.route.routeId === tutorialRoute.id
      ? save.run
      : createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          getRouteBattleEncounterIds(tutorialRoute, route),
          undefined,
          gameData.artifacts,
          selectedRoleId,
        )
  const run = createRouteAwareArtifactOffer(
    syncRunWithRoute(loadedRun, route),
    route,
  )
  const currentEncounter = getCurrentRouteEncounter(tutorialRoute, route, gameData.encounters)
  const fallbackEncounter = getCurrentRouteEncounter(
    tutorialRoute,
    createInitialRouteState(tutorialRoute),
    gameData.encounters,
  )

  if (!currentEncounter && !fallbackEncounter) {
    throw new Error('Missing first route encounter')
  }

  const battleView = currentEncounter
    ? createBattleForEncounter(currentEncounter, run, route)
    : {
        run,
        battle: createBattle(
          [getEnemyDefinition(fallbackEncounter!.enemyDefinitionId)],
          run.unlocks,
          run.deckCards,
          run.verdict.maxIncenseBonus,
          run.playerForm,
          run.resources,
          undefined,
          0,
          run.artifacts,
          run.verdict.registerEntries,
          undefined,
          undefined,
          undefined,
          undefined,
          createInitialEnemyIntentIdsForRoute(
            [fallbackEncounter!.enemyDefinitionId],
            route.routeTendencyIds ?? [],
          ),
          run.incenseSeals,
        ),
      }

  return {
    run: battleView.run,
    battle: battleView.battle,
    route,
    selectedEnemyInstanceId: getFirstLivingEnemy(battleView.battle)?.instanceId,
  }
}

function reconcileViewStateWithRoute(viewState: TutorialBattleViewState): TutorialBattleViewState {
  const run = syncRunWithRoute(viewState.run, viewState.route)
  const currentEncounter = getCurrentRouteEncounter(
    tutorialRoute,
    viewState.route,
    gameData.encounters,
  )

  if (
    !currentEncounter ||
    hasPendingRunChoice(run) ||
    run.status !== 'active' ||
    battleMatchesEncounter(viewState.battle, currentEncounter)
  ) {
    return run === viewState.run
      ? viewState
      : {
          ...viewState,
          run,
        }
  }

  const nextBattleView = createBattleForEncounter(currentEncounter, run, viewState.route)

  return {
    ...viewState,
    run: nextBattleView.run,
    battle: nextBattleView.battle,
    selectedEnemyInstanceId: getFirstLivingEnemy(nextBattleView.battle)?.instanceId,
  }
}

function syncRunWithRoute(run: TutorialRunState, route: RouteState) {
  return syncTutorialRunEncounters(run, getRouteBattleEncounterIds(tutorialRoute, route))
}

function battleMatchesEncounter(battle: CombatState, encounter: EncounterDefinition) {
  const expectedEnemyIds = getEncounterEnemyDefinitionIds(encounter)
  const actualEnemyIds = battle.enemies.map((enemy) => enemy.definitionId)

  return (
    expectedEnemyIds.length === actualEnemyIds.length &&
    expectedEnemyIds.every((enemyId, index) => enemyId === actualEnemyIds[index])
  )
}

function getTutorialRoute(routes: readonly RouteDefinition[]) {
  const route = routes.find((candidate) => candidate.id === 'route_chapter_one_skeleton')

  if (!route) {
    throw new Error('Missing route definition: route_chapter_one_skeleton')
  }

  return route
}

function createBattleForEncounter(
  encounter: EncounterDefinition,
  run: TutorialRunState,
  route: RouteState,
) {
  const backlashResolution = resolveArtifactBacklashesAtBattleStart(run.artifacts, run.resources)
  const battleStartBonus = run.nextBattleStartBonus
  const battleResources = battleStartBonus
    ? {
        ...backlashResolution.resources,
        ink: backlashResolution.resources.ink + battleStartBonus.ink,
      }
    : backlashResolution.resources
  const nextRun = {
    ...run,
    artifacts: backlashResolution.artifacts,
    resources: battleResources,
    nextBattleStartBonus: undefined,
  }
  const enemyDefinitions = getEncounterEnemyDefinitionIds(encounter).map((enemyDefinitionId) =>
    getEnemyDefinition(enemyDefinitionId),
  )
  const baseInitialEnemyIntentIds = createInitialEnemyIntentIdsForRoute(
    enemyDefinitions.map((enemyDefinition) => enemyDefinition.id),
    route.routeTendencyIds ?? [],
  )
  const riskResolution = resolveBattleStartRisk({
    resources: battleResources,
    enemyDefinitions,
    initialEnemyIntentIds: baseInitialEnemyIntentIds,
  })

  return {
    run: nextRun,
    battle: createBattle(
      enemyDefinitions,
      nextRun.unlocks,
      nextRun.deckCards,
      nextRun.verdict.maxIncenseBonus,
      nextRun.playerForm,
      battleResources,
      backlashResolution.temporaryResourceDelta,
      backlashResolution.temporaryPlayerFormDelta,
      nextRun.artifacts,
      nextRun.verdict.registerEntries,
      battleStartBonus?.openingHandCardDefinitionIds ?? [],
      [
        ...backlashResolution.extraHandDefinitionIds,
        ...riskResolution.extraHandDefinitionIds,
      ],
      riskResolution.extraDrawPileDefinitionIds,
      backlashResolution.records,
      riskResolution.initialEnemyIntentIds,
      nextRun.incenseSeals,
      battleStartBonus?.incense ?? 0,
      riskResolution.openingIncensePenalty,
      riskResolution.openingDrawCount,
      riskResolution.openingAskNamePenalty,
      riskResolution.openingRiskLogRecords,
    ),
  }
}

function getSelectedLivingEnemy(
  battle: CombatState,
  selectedEnemyInstanceId: string | undefined,
) {
  return (
    battle.enemies.find(
      (enemy) => enemy.instanceId === selectedEnemyInstanceId && enemy.currentForm > 0,
    ) ?? getFirstLivingEnemy(battle)
  )
}

function getFirstLivingEnemy(battle: CombatState) {
  return battle.enemies.find((enemy) => enemy.currentForm > 0)
}

function createArtifactBattleProgress(
  battle: CombatState,
  defeatedEnemy: EnemyState,
): ArtifactBattleProgressInput {
  const askNameCount = battle.actionLog.filter(
    (entry) => entry.type === 'NAME_ASKED' && entry.payload.result !== 'no_target',
  ).length
  const breakChainCount = battle.actionLog.filter(
    (entry) =>
      entry.type === 'ARTIFACT_TRIGGERED' &&
      entry.payload.effectType === 'break_chain_incense_bonus' &&
      entry.payload.result === 'prepared',
  ).length
  const isNamedEnemy = defeatedEnemy.nameSlots.length > 0
  const settlement = battle.result.status === 'victory' ? battle.result.settlement : undefined

  return {
    askNameCount,
    catalogueNamedEnemyCount: settlement === 'catalogue' && isNamedEnemy ? 1 : 0,
    breakChainCount,
    vanquishNamedEnemyBeforeNamedCount:
      settlement === 'vanquish' && isNamedEnemy && !defeatedEnemy.isNamed ? 1 : 0,
  }
}

function getPersistentBattleResources(battle: CombatState) {
  return {
    ink: battle.resources.ink - battle.temporaryResourceDelta.ink,
    doom: battle.resources.doom - battle.temporaryResourceDelta.doom,
    fracture: battle.resources.fracture - battle.temporaryResourceDelta.fracture,
  }
}

function getPersistentBattlePlayerForm(battle: CombatState): TutorialPlayerFormState {
  const persistentMaxForm = battle.player.maxForm - battle.temporaryPlayerFormDelta

  return {
    current: Math.min(persistentMaxForm, battle.player.currentForm - battle.temporaryPlayerFormDelta),
    max: persistentMaxForm,
  }
}

function getRevealedNameKeys(enemy: EnemyState) {
  return enemy.nameSlots
    .filter((slot) => slot.isRevealed && slot.nameKey)
    .map((slot) => slot.nameKey as string)
}

function getEnemyDefinition(definitionId: string) {
  const enemy = enemyDefinitionsById.get(definitionId)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${definitionId}`)
  }

  return enemy
}
