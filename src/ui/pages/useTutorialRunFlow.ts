import { useEffect, useState } from 'react'
import {
  advanceTutorialRun,
  type ArtifactBacklashRecord,
  type ArtifactBattleProgressInput,
  completeCurrentRouteNode,
  createInitialBattleState,
  createInitialRouteState,
  createInitialTutorialRunState,
  failTutorialRun,
  getEncounterEnemyDefinitionIds,
  getCurrentRouteEncounter,
  getCurrentRouteEvent,
  getCurrentRouteNode,
  getRouteBattleEncounterIds,
  reduceBattleState,
  resolveArtifactBacklashesAtBattleStart,
  resolveTutorialEvent,
  resolveTutorialRedInk,
  resolveTutorialRest,
  resolveTutorialReward,
  resolveTutorialShopPurchase,
  resolveTutorialVerdict,
  type BattleReducerContext,
} from '../../core'
import { gameData } from '../../data'
import type {
  CardDefinition,
  CardId,
  CardInstance,
  CombatState,
  EncounterDefinition,
  EnemyDefinition,
  EnemyState,
  RedInkAnnotationId,
  RouteDefinition,
  RouteState,
  RunDeckCard,
  RunDeckCardId,
  SettingsState,
  TutorialRestOptionId,
  TutorialRunState,
  TutorialSaveData,
  TutorialVerdictChoiceId,
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
  readonly settings?: SettingsState
  readonly onSaveChange?: (run: TutorialRunState, route: RouteState) => void
}

const battleContext: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
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
  onSaveChange,
}: Pick<BattleHudProps, 'initialSave' | 'onSaveChange'>) {
  const [viewState, setViewState] = useState(() => createInitialTutorialBattleView(initialSave))

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

  function restartCurrentBattle() {
    setViewState((current) => {
      if (hasPendingRunChoice(current.run)) {
        return current
      }

      const encounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)

      if (!encounter) {
        return createInitialTutorialBattleView()
      }

      const nextBattleView = createBattleForEncounter(encounter, current.run)

      return {
        ...current,
        run: nextBattleView.run,
        battle: nextBattleView.battle,
        selectedEnemyInstanceId: getFirstLivingEnemy(nextBattleView.battle)?.instanceId,
      }
    })
  }

  function restartTutorialRun() {
    setViewState(createInitialTutorialBattleView())
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
      run: failTutorialRun(current.run, 'battle_defeat'),
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

      const defeatedEnemy = current.battle.enemies.find(
        (candidate) => candidate.instanceId === result.enemyInstanceId,
      )
      const defeatedEnemyDefinition = defeatedEnemy
        ? getEnemyDefinition(defeatedEnemy.definitionId)
        : undefined
      const nextRun = advanceTutorialRun(
        current.run,
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
      )
      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)

      return {
        run: nextRun,
        battle: current.battle,
        route: nextRoute,
      }
    })
  }

  function chooseReward(cardDefinitionId?: CardId) {
    setViewState((current) => {
      const nextRun = resolveTutorialReward(current.run, cardDefinitionId)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
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

  function chooseVerdict(choiceId: TutorialVerdictChoiceId) {
    setViewState((current) => {
      const nextRun = resolveTutorialVerdict(current.run, choiceId)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
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
          ? resolveTutorialRedInk(current.run, { deckCardId, annotationId })
          : resolveTutorialRedInk(current.run)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, current.route, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
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
      const event = getCurrentRouteEvent(node, gameData.events, current.run)

      if (!event) {
        return current
      }

      const nextRun = resolveTutorialEvent(current.run, event, optionId)
      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
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

      const nextRun = resolveTutorialRest(current.run, {
        optionId,
        deckCardId,
        routeNodeId: node.id,
      })
      const nextRoute = completeCurrentRouteNode(tutorialRoute, current.route)
      const nextEncounter = getCurrentRouteEncounter(tutorialRoute, nextRoute, gameData.encounters)
      const nextBattleView =
        nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
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

  function buyShopItem(itemId: string, deckCardId?: RunDeckCardId) {
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
            routeNodeId: node.id,
          },
          gameData.shopItems,
          gameData.cards,
        ),
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
        ? createBattleForEncounter(nextEncounter, current.run)
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
        ? createBattleForEncounter(nextEncounter, current.run)
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

  return {
    viewState,
    actions: {
      playCard,
      selectEnemyTarget,
      endTurn,
      restartCurrentBattle,
      restartTutorialRun,
      abandonTutorialRun,
      settleBattleDefeat,
      advanceAfterVictory,
      chooseReward,
      chooseVerdict,
      applyRedInk,
      chooseEvent,
      chooseRest,
      buyShopItem,
      leaveShop,
      advancePlaceholderNode,
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
  return Boolean(run.pendingVerdict || run.pendingRedInk || run.pendingReward)
}

export function isFinalEncounter(run: TutorialRunState) {
  return run.currentEncounterIndex >= run.encounterIds.length - 1
}

function createBattle(
  enemyDefinitions: readonly EnemyDefinition[],
  unlocks: UnlockState,
  deckCards?: readonly RunDeckCard[],
  maxIncenseBonus = 0,
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
  artifacts?: TutorialRunState['artifacts'],
  extraHandDefinitionIds: readonly CardId[] = [],
  artifactBacklashRecords: readonly ArtifactBacklashRecord[] = [],
) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinitions,
    unlocks,
    deckCards,
    maxIncenseBonus,
    resources,
    temporaryResourceDelta,
    artifacts,
    extraHandDefinitionIds,
    artifactBacklashRecords,
  })
}

function createInitialTutorialBattleView(save?: TutorialSaveData): TutorialBattleViewState {
  const route =
    save?.route.routeId === tutorialRoute.id ? save.route : createInitialRouteState(tutorialRoute)
  const run =
    save?.route.routeId === tutorialRoute.id
      ? save.run
      : createInitialTutorialRunState(
          gameData.tutorialUnlocks,
          getRouteBattleEncounterIds(tutorialRoute, route),
          undefined,
          gameData.artifacts,
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
      ? createBattleForEncounter(currentEncounter, run)
      : {
          run,
          battle: createBattle(
            [getEnemyDefinition(fallbackEncounter!.enemyDefinitionId)],
            run.unlocks,
            run.deckCards,
            run.verdict.maxIncenseBonus,
            run.resources,
            undefined,
            run.artifacts,
          ),
        }

  return {
    run: battleView.run,
    battle: battleView.battle,
    route,
    selectedEnemyInstanceId: getFirstLivingEnemy(battleView.battle)?.instanceId,
  }
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
) {
  const backlashResolution = resolveArtifactBacklashesAtBattleStart(run.artifacts, run.resources)
  const nextRun = {
    ...run,
    artifacts: backlashResolution.artifacts,
  }

  return {
    run: nextRun,
    battle: createBattle(
      getEncounterEnemyDefinitionIds(encounter).map((enemyDefinitionId) =>
        getEnemyDefinition(enemyDefinitionId),
      ),
      nextRun.unlocks,
      nextRun.deckCards,
      nextRun.verdict.maxIncenseBonus,
      backlashResolution.resources,
      backlashResolution.temporaryResourceDelta,
      nextRun.artifacts,
      backlashResolution.extraHandDefinitionIds,
      backlashResolution.records,
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
  const isNamedEnemy = defeatedEnemy.nameSlots.length > 0
  const settlement = battle.result.status === 'victory' ? battle.result.settlement : undefined

  return {
    askNameCount,
    catalogueNamedEnemyCount: settlement === 'catalogue' && isNamedEnemy ? 1 : 0,
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
