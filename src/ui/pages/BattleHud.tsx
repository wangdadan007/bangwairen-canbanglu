import { useMemo } from 'react'
import {
  DEFAULT_PLAYABLE_ROLE_ID,
  getLinzhaoPlayBlockReason,
  getPlayableRoleDefinition,
  getSpendInkCleanseStatus,
  getSpendInkGuardNameStatus,
} from '../../core'
import type { RouteFlowKind } from '../../core'
import { gameData } from '../../data'
import { useAudioCue, type AudioCue } from '../audio/audioCues'
import { ArtifactBar } from './ArtifactBar'
import { ArtifactOfferPage } from './ArtifactOfferPage'
import { EventPage } from './EventPage'
import { RedInkPage } from './RedInkPage'
import { RestPage } from './RestPage'
import { RewardPage } from './RewardPage'
import { RoutePage } from './RoutePage'
import { RunSummaryPage } from './RunSummaryPage'
import { ShopPage } from './ShopPage'
import { VerdictPage } from './VerdictPage'
import {
  createPressureFeedback,
  createBossPressureFeedback,
  createRitualFeedback,
  createRunRitualFeedback,
  formatLogEntry,
  getAltarEffectLabel,
  getAltarSlotLabel,
  getAltarSlotWindowLabel,
  getAltarWindowHint,
  getCardEffectLabels,
  getCurrentAbnormalMove,
  getEnemyDefinitionName,
  getLogEntryClassName,
  getMoveLabel,
  getRouteFlowLabel,
  getRunProgressLabel,
  getSettlementLabel,
  getSettlementText,
  getTermTooltip,
  getUnlockStageName,
  isBossEnemyDefinition,
  t,
  type PressureFeedback,
  type RitualFeedback,
} from './actionLogView'
import { selectBattleHudState } from './battleHudSelectors'
import {
  createFirstRunGuidance,
  type FirstRunGuidance,
} from './firstRunGuidance'
import {
  artifactDefinitionsById,
  createCardDefinitionMap,
  createCardInstanceMap,
  encounterDefinitionsById,
  hasPendingRunChoice,
  isFinalEncounter,
  tutorialRoute,
  useTutorialRunFlow,
  type BattleHudProps,
} from './useTutorialRunFlow'
import type {
  AltarState,
  ActiveLinzhaoState,
  CardDefinition,
  CombatState,
  EncounterDefinition,
  EnemyIntentDefinition,
  EnemyState,
  RouteNodeDefinition,
  TutorialRunState,
} from '../../types'

export function BattleHud({
  initialSave,
  selectedRoleId = DEFAULT_PLAYABLE_ROLE_ID,
  settings,
  onSaveChange,
}: BattleHudProps) {
  const { viewState, actions } = useTutorialRunFlow({ initialSave, selectedRoleId, onSaveChange })
  const { battle, run } = viewState
  const {
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
    latestLog,
    runSummary,
  } = selectBattleHudState(viewState)
  const {
    playCard,
    selectEnemyTarget,
    endTurn,
    spendInkGuardName,
    spendInkCleanse,
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
    chooseArtifact,
    leaveShop,
    advancePlaceholderNode,
    chooseRouteNode,
  } = actions
  const hasPendingChoice = hasPendingRunChoice(run)
  const showActiveBattlePanels = Boolean(
    currentEncounter &&
      run.status === 'active' &&
      !hasPendingChoice &&
      battle.result.status === 'ongoing',
  )
  const cardDefinitionsById = useMemo(() => createCardDefinitionMap(gameData.cards), [])
  const allCardsByInstanceId = useMemo(
    () =>
      createCardInstanceMap([
        ...battle.player.deck,
        ...battle.hand,
        ...battle.discardPile,
        ...battle.exhaustPile,
        ...battle.linzhaoPile,
      ]),
    [battle],
  )
  const inkGuardStatus = getSpendInkGuardNameStatus(battle, enemy?.instanceId)
  const inkCleanseStatus = getSpendInkCleanseStatus(battle)
  const pressureFeedback = useMemo(
    () => createPressureFeedback(battle, cardDefinitionsById, allCardsByInstanceId),
    [allCardsByInstanceId, battle, cardDefinitionsById],
  )
  const ritualFeedback = useMemo(
    () => createRitualFeedback(battle, cardDefinitionsById, allCardsByInstanceId),
    [allCardsByInstanceId, battle, cardDefinitionsById],
  )
  const runRitualFeedback = useMemo(() => createRunRitualFeedback(run), [run])
  const bossPressureFeedback = useMemo(() => createBossPressureFeedback(battle), [battle])
  const firstRunGuidance = useMemo(
    () =>
      createFirstRunGuidance({
        battle,
        run,
        currentEncounter,
        currentRouteFlowKind,
        currentRouteNode,
      }),
    [battle, currentEncounter, currentRouteFlowKind, currentRouteNode, run],
  )
  const audioCue = useMemo<AudioCue | undefined>(() => {
    const feedback = ritualFeedback ?? pressureFeedback ?? runRitualFeedback ?? bossPressureFeedback

    return feedback
      ? {
          id: feedback.id,
          kind: feedback.audioCue,
        }
      : undefined
  }, [bossPressureFeedback, pressureFeedback, ritualFeedback, runRitualFeedback])
  const hudClassName = [
    'battle-hud',
    settings?.compactTerms ? 'compact-terms' : '',
    settings?.animationsEnabled === false ? 'animations-off' : '',
    settings?.audio.muted ? 'audio-muted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useAudioCue(audioCue, settings)

  return (
    <aside className={hudClassName} aria-label="第一章路线纵切">
      <header className="hud-header">
        <div>
          <p className="panel-kicker">第一章完整可玩版</p>
          <h2>{currentHeading}</h2>
        </div>
        <div className="dev-controls">
          <button
            className="ghost-button"
            disabled={!currentEncounter || hasPendingChoice}
            type="button"
            onClick={restartCurrentBattle}
          >
            重开当前战斗
          </button>
          <button className="ghost-button" type="button" onClick={restartTutorialRun}>
            重开第一章路线
          </button>
          <button
            className="ghost-button"
            disabled={run.status !== 'active'}
            type="button"
            onClick={abandonTutorialRun}
          >
            放弃本局
          </button>
        </div>
      </header>

      <TutorialRunPanel run={run} currentEncounter={currentEncounter} />
      {firstRunGuidance ? <FirstRunGuidancePanel guidance={firstRunGuidance} /> : null}
      <RoutePage
        route={tutorialRoute}
        routeState={viewState.route}
        t={t}
        onChooseRouteNode={chooseRouteNode}
      />
      <ArtifactBar
        artifacts={run.artifacts}
        artifactDefinitionsById={artifactDefinitionsById}
        t={t}
      />
      {runRitualFeedback ? <RitualFeedbackPanel feedback={runRitualFeedback} /> : null}

      {currentEncounter &&
      battle.result.status === 'victory' &&
      run.status === 'active' &&
      !hasPendingChoice ? (
        <section className="result-banner" aria-live="polite">
          <span>{getSettlementLabel(battle.result.settlement)}</span>
          <strong>{getSettlementText(battle.result.settlement)}</strong>
          <p>{currentEncounter ? t(currentEncounter.completionKey) : '本轮教学战已完成。'}</p>
          <div className="result-actions">
            <button type="button" onClick={advanceAfterVictory}>
              {battle.result.settlement === 'catalogue'
                ? '进入裁定'
                : isFinalEncounter(run)
                  ? '查看收束奖励'
                  : '查看战后奖励'}
            </button>
          </div>
        </section>
      ) : null}

      {currentEncounter && battle.result.status === 'defeat' && run.status === 'active' ? (
        <section className="result-banner run-failed" aria-live="polite">
          <span>失败</span>
          <strong>己形已散，本场战斗已经失败。</strong>
          <p>进入第一章结算页，保留本局已经完成的伏诛、归册、奖励和裁定记录。</p>
          <div className="result-actions">
            <button type="button" onClick={settleBattleDefeat}>
              查看结算
            </button>
          </div>
        </section>
      ) : null}

      {run.pendingArtifactOffer ? (
        <ArtifactOfferPage
          artifactDefinitionsById={artifactDefinitionsById}
          offer={run.pendingArtifactOffer}
          t={t}
          onChoose={chooseArtifact}
        />
      ) : null}

      {!run.pendingArtifactOffer && run.pendingVerdict ? (
        <VerdictPage
          offer={run.pendingVerdict}
          t={t}
          resources={run.resources}
          verdict={run.verdict}
          onChoose={chooseVerdict}
        />
      ) : null}

      {!run.pendingArtifactOffer && !run.pendingVerdict && run.pendingRedInk ? (
        <RedInkPage
          cardDefinitionsById={cardDefinitionsById}
          deckCards={run.deckCards}
          offer={run.pendingRedInk}
          t={t}
          onApply={applyRedInk}
          onSkip={() => applyRedInk()}
        />
      ) : null}

      {!run.pendingArtifactOffer && !run.pendingVerdict && !run.pendingRedInk && run.pendingReward ? (
        <RewardPage
          cardDefinitionsById={cardDefinitionsById}
          offer={run.pendingReward}
          t={t}
          onChooseCard={chooseReward}
          onSkip={() => chooseReward()}
        />
      ) : null}

      {!currentEncounter &&
      currentRouteFlowKind === 'event' &&
      currentRouteEvent &&
      !hasPendingChoice &&
      run.status === 'active' ? (
        <EventPage
          cardDefinitionsById={cardDefinitionsById}
          event={currentRouteEvent}
          options={currentEventOptions}
          run={run}
          t={t}
          onChoose={chooseEvent}
        />
      ) : null}

      {!currentEncounter &&
      currentRouteFlowKind === 'shop' &&
      !hasPendingChoice &&
      run.status === 'active' ? (
        <ShopPage
          artifactDefinitionsById={artifactDefinitionsById}
          cardDefinitionsById={cardDefinitionsById}
          deckCards={run.deckCards}
          items={currentShopItems}
          run={run}
          t={t}
          onBuy={buyShopItem}
          onLeave={leaveShop}
        />
      ) : null}

      {!currentEncounter &&
      currentRouteFlowKind === 'rest' &&
      !hasPendingChoice &&
      run.status === 'active' ? (
        <RestPage
          artifactDefinitionsById={artifactDefinitionsById}
          cardDefinitionsById={cardDefinitionsById}
          deckCards={run.deckCards}
          options={currentRestOptions}
          run={run}
          t={t}
          onChoose={chooseRest}
        />
      ) : null}

      {!currentEncounter &&
      currentRouteNode &&
      currentRouteFlowKind !== 'complete' &&
      (currentRouteFlowKind !== 'event' || !currentRouteEvent) &&
      currentRouteFlowKind !== 'shop' &&
      currentRouteFlowKind !== 'rest' &&
      !hasPendingChoice &&
      run.status === 'active' ? (
        <RoutePlaceholderPanel
          node={currentRouteNode}
          flowKind={currentRouteFlowKind}
          t={t}
          onContinue={advancePlaceholderNode}
        />
      ) : null}

      {run.status !== 'active' && !hasPendingChoice ? (
        <RunSummaryPage summary={runSummary} t={t} onRestart={restartTutorialRun} />
      ) : null}

      {showActiveBattlePanels ? (
        <EnemyListPanel
          enemies={battle.enemies}
          selectedEnemyInstanceId={enemy?.instanceId}
          canSelect={canAct}
          onSelect={selectEnemyTarget}
        />
      ) : null}
      {showActiveBattlePanels && pressureFeedback ? (
        <PressureFeedbackPanel feedback={pressureFeedback} />
      ) : null}
      {showActiveBattlePanels && ritualFeedback ? (
        <RitualFeedbackPanel feedback={ritualFeedback} />
      ) : null}
      {showActiveBattlePanels && bossPressureFeedback ? (
        <RitualFeedbackPanel feedback={bossPressureFeedback} />
      ) : null}

      {showActiveBattlePanels ? (
        <section className="hud-section">
          <div className="section-title-row">
            <h3>案前</h3>
            <span className="turn-pill">第 {battle.turn} 回合</span>
          </div>
          <div className="resource-grid" aria-label="玩家资源">
            <Metric
              label="己形"
              tooltip={getTermTooltip('player_shape')}
              value={`${battle.player.currentForm} / ${battle.player.maxForm}`}
            />
            <Metric
              label="香火"
              tooltip={getTermTooltip('incense')}
              value={`${battle.player.incense} / ${battle.player.maxIncense}`}
            />
            <Metric label="墨" tooltip={getTermTooltip('ink')} value={battle.resources.ink.toString()} />
            <Metric label="劫数" tooltip={getTermTooltip('doom')} value={battle.resources.doom.toString()} />
            <Metric label="榜裂" tooltip={getTermTooltip('fracture')} value={battle.resources.fracture.toString()} />
            <Metric label="抽牌堆" value={battle.drawPile.length.toString()} />
            <Metric label="弃牌堆" value={battle.discardPile.length.toString()} />
            <Metric label="消耗区" value={battle.exhaustPile.length.toString()} />
          </div>
          <AltarPanel altars={battle.altars} cardDefinitionsById={cardDefinitionsById} />
          <LinzhaoPanel
            activeLinzhao={battle.linzhao}
            cardDefinitionsById={cardDefinitionsById}
          />
        </section>
      ) : null}

      {showActiveBattlePanels ? (
        <section className="hud-section">
          <div className="section-title-row">
            <h3>手牌</h3>
            <span className="target-note">目标：{enemy ? getEnemyDefinitionName(enemy.definitionId) : '无'}</span>
          </div>
          <div className="hand-list" aria-label="玩家手牌">
            {battle.hand.length > 0 ? (
              battle.hand.map((card) => {
                const definition = cardDefinitionsById.get(card.definitionId)
                const isAffordable = definition ? definition.cost <= battle.player.incense : false
                const linzhaoBlockReason = definition
                  ? getLinzhaoPlayBlockReason(battle, definition)
                  : undefined
                const isDisabled = !canAct || !definition || !isAffordable || Boolean(linzhaoBlockReason)
                const disabledReason = getCardDisabledReason({
                  battle,
                  canAct,
                  definition,
                  enemy,
                  isAffordable,
                  run,
                })

                return (
                  <button
                    className="card-button"
                    disabled={isDisabled}
                    key={card.instanceId}
                    title={disabledReason}
                    type="button"
                    onClick={() => playCard(card)}
                  >
                    <span className="card-topline">
                      <strong>{definition ? t(definition.nameKey) : card.definitionId}</strong>
                      <span>{definition?.cost ?? '?'} 香火</span>
                    </span>
                    <span className="card-rules">
                      {definition ? t(definition.rulesTextKey) : '缺少卡牌定义'}
                    </span>
                    {definition ? (
                      <span className="card-tags" aria-label="卡牌效果">
                        {getCardEffectLabels(definition, card).map((label) => (
                          <span key={label} title={getEffectTooltip(label)}>
                            {label}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {card.annotations.length > 0 ? (
                      <span className="annotation-row" aria-label="朱批词条">
                        {card.annotations.map((annotation) => (
                          <span key={annotation.id}>朱批：{t(annotation.nameKey)}</span>
                        ))}
                      </span>
                    ) : null}
                    {!isAffordable && definition ? (
                      <span className="card-state">香火不足</span>
                    ) : null}
                    {isDisabled && disabledReason && isAffordable ? (
                      <span className="card-state">{disabledReason}</span>
                    ) : null}
                  </button>
                )
              })
            ) : (
              <p className="empty-state">案上暂无手牌。</p>
            )}
          </div>
        </section>
      ) : null}

      {showActiveBattlePanels ? (
        <footer className="hud-actions">
          <button
            type="button"
            disabled={!canAct || !inkGuardStatus.canUse}
            title={inkGuardStatus.reason}
            onClick={spendInkGuardName}
          >
            留墨护名
          </button>
          <button
            type="button"
            disabled={!canAct || !inkCleanseStatus.canUse}
            title={inkCleanseStatus.reason}
            onClick={spendInkCleanse}
          >
            墨净污卷
          </button>
          <button type="button" disabled={!canAct} onClick={endTurn}>
            结束回合
          </button>
          <span className="hud-action-hint">
            {inkGuardStatus.canUse
              ? getInkGuardReadyText(inkGuardStatus.mode)
              : inkGuardStatus.reason}
            {'；'}
            {inkCleanseStatus.canUse
              ? getInkCleanseReadyText(inkCleanseStatus.cardDefinitionId, cardDefinitionsById)
              : inkCleanseStatus.reason}
          </span>
        </footer>
      ) : null}

      {showActiveBattlePanels ? (
        <section className="hud-section log-section">
          <div className="section-title-row">
            <h3>战斗日志</h3>
            <span>{battle.actionLog.length} 条</span>
          </div>
          <ol className="log-list" aria-label="战斗日志">
            {latestLog.map((entry) => (
              <li className={getLogEntryClassName(entry)} key={entry.id}>
                {formatLogEntry(entry, battle, cardDefinitionsById, allCardsByInstanceId)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </aside>
  )
}

function RoutePlaceholderPanel({
  node,
  flowKind,
  t,
  onContinue,
}: {
  readonly node: RouteNodeDefinition
  readonly flowKind: RouteFlowKind
  readonly t: (key: string | undefined) => string
  readonly onContinue: () => void
}) {
  return (
    <section className="result-banner route-placeholder" aria-live="polite">
      <span>{getRouteFlowLabel(flowKind)}</span>
      <strong>{t(node.nameKey)}</strong>
      <p>{t(node.descriptionKey)}</p>
      <div className="result-actions">
        <button type="button" onClick={onContinue}>
          继续前行
        </button>
      </div>
    </section>
  )
}

function TutorialRunPanel({
  run,
  currentEncounter,
}: {
  readonly run: TutorialRunState
  readonly currentEncounter?: EncounterDefinition
}) {
  const role = run.roleId ? getPlayableRoleDefinition(run.roleId) : undefined

  return (
    <section className="tutorial-run-panel" aria-label="路线战斗进度">
      <div className="section-title-row">
        <h3>路线战斗进度</h3>
        <span>{getRunProgressLabel(run)}</span>
      </div>
      <ol className="tutorial-steps">
        {run.encounterIds.map((encounterId, index) => {
          const encounter = getEncounterDefinition(encounterId)
          const settlement = run.settlements[index]
          const isDone = Boolean(settlement)
          const isCurrent =
            !isDone && index === run.currentEncounterIndex && currentEncounter?.id === encounterId

          return (
            <li
              className={isDone ? 'done' : isCurrent ? 'current' : 'locked'}
              key={`${encounterId}-${index}`}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{t(encounter.nameKey)}</strong>
                <small>
                  {settlement
                    ? getSettlementLabel(settlement.settlement)
                    : isCurrent
                      ? t(encounter.lessonKey)
                      : '待进入'}
                </small>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="unlock-row" aria-label="已解锁机制">
        {run.unlocks.stages.map((stageId) => (
          <span key={stageId}>{getUnlockStageName(stageId)}</span>
        ))}
      </div>
      <div className="run-summary-row" aria-label="牌组与奖励记录">
        {role ? <span>执簿者 {t(role.nameKey)}</span> : null}
        <span>牌组 {run.deckCards.length} 张</span>
        <span>
          己形 {run.playerForm.current} / {run.playerForm.max}
        </span>
        <span>香火钱 {run.currency.incenseMoney}</span>
        <span>墨 {run.resources.ink}</span>
        <span>劫数 {run.resources.doom}</span>
        <span>榜裂 {run.resources.fracture}</span>
        <span>登簿 {run.verdict.registerEntries.length}</span>
        <span>裁定 {run.verdict.records.length} 次</span>
        <span>法宝 {run.artifacts.artifacts.length} 件</span>
        <span>
          认主 {run.artifacts.artifacts.filter((artifact) => artifact.bindingStatus === 'bound').length}
        </span>
        <span>已领奖励 {run.rewards.length} 次</span>
        <span>事件 {run.events.records.length} 次</span>
        <span>商店 {run.shops.records.length} 次</span>
        <span>休整 {run.rests.records.length} 次</span>
        <span>朱批 {run.redInkRecords.filter((record) => !record.skipped).length} 次</span>
        {run.pendingVerdict ? <span>待裁定</span> : null}
        {run.pendingReward ? <span>待选奖励</span> : null}
        {run.pendingRedInk ? <span>待朱批</span> : null}
        {run.pendingArtifactOffer ? <span>待选法宝</span> : null}
      </div>
    </section>
  )
}

function getEncounterDefinition(encounterId: string) {
  const encounter = encounterDefinitionsById.get(encounterId)

  if (!encounter) {
    throw new Error(`Missing encounter definition: ${encounterId}`)
  }

  return encounter
}

function EnemyListPanel({
  enemies,
  selectedEnemyInstanceId,
  canSelect,
  onSelect,
}: {
  readonly enemies: readonly EnemyState[]
  readonly selectedEnemyInstanceId?: string
  readonly canSelect: boolean
  readonly onSelect: (enemyInstanceId: string) => void
}) {
  return (
    <section className="enemy-list-panel" aria-label="敌方目标">
      <div className="section-title-row">
        <h3>敌方</h3>
        <span>{enemies.length > 1 ? `多敌遭遇 ${enemies.length} 名` : '单敌遭遇'}</span>
      </div>
      <div className="enemy-list">
        {enemies.map((enemy) => (
          <EnemyPanel
            canSelect={canSelect && enemy.currentForm > 0}
            enemy={enemy}
            isSelected={enemy.instanceId === selectedEnemyInstanceId}
            key={enemy.instanceId}
            onSelect={() => onSelect(enemy.instanceId)}
          />
        ))}
      </div>
    </section>
  )
}

function EnemyPanel({
  enemy,
  isSelected,
  canSelect,
  onSelect,
}: {
  readonly enemy: EnemyState
  readonly isSelected: boolean
  readonly canSelect: boolean
  readonly onSelect: () => void
}) {
  const formPercent = Math.max(0, Math.min(100, (enemy.currentForm / enemy.maxForm) * 100))
  const isIntentMasked = enemy.currentIntentVisibility === 'masked'
  const intentLabel = getCurrentIntentLabel(enemy.currentIntent, isIntentMasked, enemy.tier)
  const abnormalMove = getCurrentAbnormalMove(enemy)
  const visibleAbnormalMove = isIntentMasked ? undefined : abnormalMove
  const hasPreparedCounter = visibleAbnormalMove
    ? enemy.blockedAbnormalMoveTypes.includes(visibleAbnormalMove.type)
    : false
  const intentKind =
    enemy.currentIntent?.kind === 'abnormal_move'
      ? '异动'
      : enemy.currentIntent?.kind === 'incoming_force'
        ? '来势'
        : '待定'
  const intentTone =
    isIntentMasked
      ? 'hidden'
      : enemy.currentIntent?.kind === 'abnormal_move'
      ? 'abnormal'
      : enemy.incomingForce > 0
        ? 'incoming'
        : 'quiet'
  const nextIntentTone =
    enemy.nextIntentPreview?.kind === 'abnormal_move'
      ? 'abnormal'
      : enemy.nextIntentPreview?.kind === 'incoming_force'
        ? 'incoming'
        : 'hidden'
  const nextIntentLabel = enemy.nextIntentPreview
    ? getPreviewIntentLabel(enemy.nextIntentPreview)
    : '未辨'
  const nextIntentDetail = enemy.nextIntentPreview
    ? getPreviewIntentDetail(enemy.nextIntentPreview)
    : '辨势后显示，用于规划下回合。'
  const visibleIncomingForce = isIntentMasked ? null : enemy.incomingForce
  const incomingForceAttachment = isIntentMasked
    ? undefined
    : getIncomingForceAttachmentText(enemy.currentIntent)
  const activeNamedPhase = enemy.namedPhase?.isActive ? enemy.namedPhase : undefined

  return (
    <article
      className={[
        'enemy-panel',
        isSelected ? 'selected' : '',
        isBossEnemyDefinition(enemy.definitionId) ? 'boss-pressure' : '',
        enemy.currentForm <= 0 ? 'settled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="敌人状态"
    >
      <div className="section-title-row">
        <div>
          <p className="panel-kicker" title={getTermTooltip('shape')}>
            敌形（形）
          </p>
          <h3>{getEnemyDefinitionName(enemy.definitionId)}</h3>
        </div>
        <div className="enemy-panel-actions">
          <span
            className={enemy.isNamed ? 'status-pill named' : 'status-pill'}
            title={activeNamedPhase ? getTermTooltip('named_phase') : getTermTooltip('named')}
          >
            {activeNamedPhase ? '现形' : enemy.isNamed ? '正名' : enemy.currentForm <= 0 ? '已收束' : '未正名'}
          </span>
          <button
            className="ghost-button target-button"
            disabled={!canSelect || isSelected}
            type="button"
            onClick={onSelect}
          >
            {isSelected ? '当前目标' : '设为目标'}
          </button>
        </div>
      </div>

      <div className="form-meter" aria-label={`形 ${enemy.currentForm} / ${enemy.maxForm}`}>
        <span style={{ width: `${formPercent}%` }} />
      </div>
      <div className="form-row">
        <span title={getTermTooltip('shape')}>形</span>
        <strong>
          {enemy.currentForm} / {enemy.maxForm}
        </strong>
      </div>

      <div className="name-slots" aria-label="名格">
        {enemy.nameSlots.length > 0 ? (
          enemy.nameSlots.map((slot) => (
            <span className={slot.isRevealed ? 'name-slot revealed' : 'name-slot'} key={slot.index}>
              {slot.isRevealed ? t(slot.nameKey) : '未揭示'}
            </span>
          ))
        ) : (
          <span className="name-slot revealed">无名</span>
        )}
      </div>
      {(enemy.fireMark ?? 0) > 0 || (enemy.thunderLead ?? 0) > 0 ? (
        <div className="enemy-status-effects" aria-label="破形附着">
          {(enemy.fireMark ?? 0) > 0 ? <span>火印 {enemy.fireMark}</span> : null}
          {(enemy.thunderLead ?? 0) > 0 ? <span>雷引 {enemy.thunderLead}</span> : null}
        </div>
      ) : null}

      <div className={`intent-banner ${intentTone}`} aria-label="敌人下一次行动">
        <span
          title={
            intentKind === '来势'
              ? getTermTooltip('incoming_force')
              : intentKind === '异动'
                ? getTermTooltip('abnormal_move')
                : undefined
          }
        >
          {intentKind === '来势' ? '直接冲击（来势）' : intentKind === '异动' ? '特殊行为（异动）' : '行动'}
        </span>
        <strong>{intentLabel}</strong>
        <small>
          {isIntentMasked
            ? '辨势可揭示具体行动'
            : visibleAbnormalMove
            ? hasPreparedCounter
              ? '专门处理已布置'
              : '需要专门效果处理'
            : enemy.incomingForce > 0
              ? '可被封势降低'
              : '暂无直接来势'}
        </small>
      </div>
      <div className={`intent-next-preview ${nextIntentTone}`} aria-label="后一动预告">
        <span>后一动</span>
        <strong>{nextIntentLabel}</strong>
        <small>{nextIntentDetail}</small>
      </div>
      <div className="intent-detail-grid" aria-label="敌人意图详情">
        <div>
          <span title={getTermTooltip('incoming_force')}>当前来势值</span>
          <strong>{visibleIncomingForce ?? '未辨'}</strong>
        </div>
        <div className={visibleAbnormalMove ? 'intent-alert active' : 'intent-alert'}>
          <span title={getTermTooltip('abnormal_move')}>异动预警</span>
          <strong>
            {isIntentMasked
              ? '势影遮蔽'
              : visibleAbnormalMove
                ? t(visibleAbnormalMove.descriptionKey)
                : '无'}
          </strong>
        </div>
      </div>
      {incomingForceAttachment ? (
        <div className="intent-attachment-note">
          <span title={getTermTooltip('incoming_force')}>来势附带</span>
          <strong>{incomingForceAttachment}</strong>
        </div>
      ) : null}
      {activeNamedPhase ? (
        <div className="intent-attachment-note named-phase-note">
          <span title={getTermTooltip('named_phase')}>现形反扑</span>
          <strong>{activeNamedPhase.descriptionKeys.map((key) => t(key)).join('；')}</strong>
        </div>
      ) : null}
      <div className="intent-rule-grid" aria-label="来势与异动处理状态">
        <div
          className={!isIntentMasked && enemy.incomingForce > 0 ? 'rule-note active' : 'rule-note'}
        >
          <span title={getTermTooltip('seal_momentum')}>压住来势（封势）</span>
          <strong>
            {isIntentMasked
              ? '需先辨势'
              : enemy.incomingForce > 0
              ? `可处理 ${enemy.incomingForce} 点`
              : visibleAbnormalMove
                ? '本次不是来势'
                : '暂无来势'}
          </strong>
        </div>
        <div
          className={
            visibleAbnormalMove
              ? hasPreparedCounter
                ? 'rule-note secured'
                : 'rule-note danger'
              : 'rule-note'
          }
        >
          <span title={getTermTooltip('counter_abnormal_move')}>专门处理（断异动）</span>
          <strong>
            {isIntentMasked
              ? '需先辨势'
              : visibleAbnormalMove
              ? hasPreparedCounter
                ? `已盯住${getMoveLabel(visibleAbnormalMove.type)}`
                : `${getMoveLabel(visibleAbnormalMove.type)}未处理`
              : '暂无异动'}
          </strong>
        </div>
      </div>
    </article>
  )
}

function getCurrentIntentLabel(
  intent: EnemyIntentDefinition | undefined,
  isIntentMasked: boolean,
  tier: EnemyState['tier'],
) {
  if (!intent) {
    return '无'
  }

  if (!isIntentMasked) {
    return t(intent.nameKey)
  }

  if (tier === 'boss') {
    return '窃榜使正在翻检残榜'
  }

  if (intent.kind === 'incoming_force') {
    return '来势：强弱不明'
  }

  return '异动：影迹不明'
}

function getPreviewIntentLabel(intent: EnemyIntentDefinition) {
  const prefix = intent.kind === 'incoming_force' ? '来势' : '异动'

  return `${prefix}：${t(intent.nameKey)}`
}

function getPreviewIntentDetail(intent: EnemyIntentDefinition) {
  const incomingForce = intent.effects.reduce(
    (total, effect) => total + (effect.type === 'INCOMING_FORCE' ? effect.amount : 0),
    0,
  )
  const abnormalMove = intent.effects.find((effect) => effect.type === 'ABNORMAL_MOVE')?.move

  if (incomingForce > 0) {
    return `预计来势 ${incomingForce}，可提前规划封势或抢收束。`
  }

  if (abnormalMove) {
    return `${getMoveLabel(abnormalMove.type)}，可提前准备断异动、地坛或问名节奏。`
  }

  return '已照见后一动。'
}

function getIncomingForceAttachmentText(intent: EnemyIntentDefinition | undefined) {
  const detailKeys =
    intent?.effects.flatMap((effect) => {
      if (effect.type !== 'INCOMING_FORCE') {
        return []
      }

      return [
        effect.descriptionKey,
        ...(effect.bonuses?.map((bonus) => bonus.descriptionKey) ?? []),
        ...(effect.aftereffects?.map((aftereffect) => aftereffect.descriptionKey) ?? []),
      ].filter((key): key is string => Boolean(key))
    }) ?? []

  return Array.from(new Set(detailKeys)).map((key) => t(key)).join(' ')
}

function PressureFeedbackPanel({ feedback }: { readonly feedback: PressureFeedback }) {
  return (
    <section
      className={`pressure-feedback ${feedback.tone}`}
      aria-label={`${feedback.label}：${feedback.title}`}
      aria-live="polite"
      role="status"
    >
      <span>{feedback.label}</span>
      <strong>{feedback.title}</strong>
      <p>{feedback.detail}</p>
    </section>
  )
}

function RitualFeedbackPanel({ feedback }: { readonly feedback: RitualFeedback }) {
  return (
    <section
      className={`ritual-feedback ${feedback.tone}`}
      aria-label={`${feedback.label}：${feedback.title}`}
      aria-live="polite"
      role="status"
    >
      <span>{feedback.label}</span>
      <strong>{feedback.title}</strong>
      <p>{feedback.detail}</p>
    </section>
  )
}

function FirstRunGuidancePanel({ guidance }: { readonly guidance: FirstRunGuidance }) {
  return (
    <section
      className={`first-run-guide ${guidance.tone}`}
      aria-label={`${guidance.eyebrow}：${guidance.title}`}
      aria-live="polite"
      role="note"
    >
      <div>
        <span>{guidance.eyebrow}</span>
        <strong>{guidance.title}</strong>
      </div>
      <p>{guidance.body}</p>
      <div className="guide-term-row" aria-label="本条提示相关术语">
        {guidance.terms.map((term) => (
          <span key={term}>{term}</span>
        ))}
      </div>
    </section>
  )
}

function Metric({
  label,
  tooltip,
  value,
}: {
  readonly label: string
  readonly tooltip?: string
  readonly value: string
}) {
  return (
    <div className="metric" title={tooltip}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getCardDisabledReason({
  battle,
  canAct,
  definition,
  enemy,
  isAffordable,
  run,
}: {
  readonly battle: CombatState
  readonly canAct: boolean
  readonly definition?: CardDefinition
  readonly enemy?: EnemyState
  readonly isAffordable: boolean
  readonly run: TutorialRunState
}) {
  if (!definition) {
    return '缺少卡牌定义'
  }

  if (!enemy) {
    return '当前没有可选目标'
  }

  if (!isAffordable) {
    return `香火不足：需要 ${definition.cost}，当前 ${battle.player.incense}`
  }

  const linzhaoBlockReason = getLinzhaoPlayBlockReason(battle, definition)

  if (linzhaoBlockReason === 'linzhao_limit_reached') {
    return '临诏区已满'
  }

  if (linzhaoBlockReason === 'linzhao_duplicate') {
    return '同名临诏已经在场'
  }

  if (hasPendingRunChoice(run)) {
    return '请先处理待裁定 / 奖励 / 朱批 / 法宝'
  }

  if (run.status !== 'active') {
    return '本局不在进行中'
  }

  if (battle.phase !== 'player_turn') {
    return '当前不是玩家回合'
  }

  if (battle.result.status !== 'ongoing') {
    return '本场已经结算'
  }

  return canAct ? undefined : '当前不能出牌'
}

function getEffectTooltip(label: string) {
  if (label === '破形') {
    return getTermTooltip('break_form')
  }

  if (label === '问名') {
    return getTermTooltip('ask_name')
  }

  if (label === '封势') {
    return getTermTooltip('seal_momentum')
  }

  if (label === '断异动') {
    return getTermTooltip('counter_abnormal_move')
  }

  if (label === '墨') {
    return getTermTooltip('ink')
  }

  if (label === '劫数') {
    return getTermTooltip('doom')
  }

  if (label === '奉坛') {
    return getTermTooltip('altar')
  }

  if (label === '临诏') {
    return getTermTooltip('linzhao')
  }

  return label
}

function getInkGuardReadyText(mode: string | undefined) {
  if (mode === 'restore_covered_name') {
    return '留墨护名可恢复 1 格被遮名迹'
  }

  if (mode === 'prepare_cover_name_guard') {
    return '留墨护名可预防下一次遮名'
  }

  return '留墨护名可用'
}

function getInkCleanseReadyText(
  cardDefinitionId: string | undefined,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
) {
  const definition = cardDefinitionId ? cardDefinitionsById.get(cardDefinitionId) : undefined

  return definition ? `墨净污卷可移除 ${t(definition.nameKey)}` : '墨净污卷可用'
}

function AltarPanel({
  altars,
  cardDefinitionsById,
}: {
  readonly altars: readonly AltarState[]
  readonly cardDefinitionsById: ReadonlyMap<string, CardDefinition>
}) {
  const altarSlots: readonly AltarState['slot'][] = ['human', 'earth', 'heaven']

  return (
    <div className="altar-grid" aria-label="奉坛状态">
      {altarSlots.map((slot) => {
        const altar = altars.find((candidate) => candidate.slot === slot)
        const sourceCard = altar ? cardDefinitionsById.get(altar.sourceCardDefinitionId) : undefined

        return (
          <div
            aria-label={`${getAltarSlotLabel(slot)}，${getAltarWindowHint(slot)}`}
            className={altar ? 'altar-slot active' : 'altar-slot'}
            key={slot}
            title={getAltarWindowHint(slot)}
          >
            <span>{getAltarSlotLabel(slot)}</span>
            <strong>{altar ? getAltarEffectLabel(altar) : '未奉坛'}</strong>
            <small>{sourceCard ? t(sourceCard.nameKey) : getAltarSlotWindowLabel(slot)}</small>
          </div>
        )
      })}
    </div>
  )
}

function LinzhaoPanel({
  activeLinzhao,
  cardDefinitionsById,
}: {
  readonly activeLinzhao: readonly ActiveLinzhaoState[]
  readonly cardDefinitionsById: ReadonlyMap<string, CardDefinition>
}) {
  const slots = [0, 1]

  return (
    <div className="linzhao-grid" aria-label="临诏状态">
      {slots.map((slotIndex) => {
        const active = activeLinzhao[slotIndex]
        const sourceCard = active
          ? cardDefinitionsById.get(active.sourceCardDefinitionId)
          : undefined

        return (
          <div
            className={active ? 'linzhao-slot active' : 'linzhao-slot'}
            key={slotIndex}
            title={active ? t(active.rulesTextKey) : getTermTooltip('linzhao')}
          >
            <span>临诏 {slotIndex + 1}</span>
            <strong>{active ? t(active.nameKey) : '未落诏'}</strong>
            <small>
              {active
                ? `${sourceCard ? t(sourceCard.nameKey) : '来源牌'} · 已触发 ${active.triggerCount}`
                : '本场持续规则位'}
            </small>
          </div>
        )
      })}
    </div>
  )
}
