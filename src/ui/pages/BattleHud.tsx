import { useMemo, useState } from 'react'
import {
  advanceTutorialRun,
  createInitialBattleState,
  createInitialTutorialRunState,
  createTutorialRunSummary,
  failTutorialRun,
  getCurrentTutorialEncounter,
  reduceBattleState,
  resolveTutorialRedInk,
  resolveTutorialReward,
  resolveTutorialVerdict,
  type BattleReducerContext,
} from '../../core'
import { gameData } from '../../data'
import { RedInkPage } from './RedInkPage'
import { RewardPage } from './RewardPage'
import { RunSummaryPage } from './RunSummaryPage'
import { VerdictPage } from './VerdictPage'
import type {
  ActionLogEntry,
  AbnormalMoveDefinition,
  CardDefinition,
  CardInstance,
  CombatState,
  EncounterDefinition,
  EnemyDefinition,
  EnemyState,
  JsonValue,
  RedInkAnnotationId,
  RunDeckCard,
  RunDeckCardId,
  TutorialVerdictChoiceId,
  TutorialRunState,
  UnlockState,
  VictorySettlement,
} from '../../types'

type PressureFeedbackTone = 'incoming' | 'sealed' | 'abnormal' | 'countered'

interface PressureFeedback {
  readonly tone: PressureFeedbackTone
  readonly label: string
  readonly title: string
  readonly detail: string
}

interface TutorialBattleViewState {
  readonly run: TutorialRunState
  readonly battle: CombatState
}

const battleContext: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

const enemyDefinitionsById = new Map(gameData.enemies.map((enemy) => [enemy.id, enemy]))
const encounterDefinitionsById = new Map(
  gameData.encounters.map((encounter) => [encounter.id, encounter]),
)

function createBattle(
  enemyDefinition: EnemyDefinition,
  unlocks: UnlockState,
  deckCards?: readonly RunDeckCard[],
  maxIncenseBonus = 0,
) {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition,
    unlocks,
    deckCards,
    maxIncenseBonus,
  })
}

export function BattleHud() {
  const [viewState, setViewState] = useState(createInitialTutorialBattleView)
  const { battle, run } = viewState
  const currentEncounter = getCurrentTutorialEncounter(run, gameData.encounters)
  const enemy = battle.enemies[0]
  const runSummary = useMemo(() => createTutorialRunSummary(run), [run])
  const cardDefinitionsById = useMemo(() => createCardDefinitionMap(gameData.cards), [])
  const allCardsByInstanceId = useMemo(() => createCardInstanceMap(battle.player.deck), [battle])
  const pressureFeedback = useMemo(
    () => createPressureFeedback(battle, cardDefinitionsById, allCardsByInstanceId),
    [allCardsByInstanceId, battle, cardDefinitionsById],
  )
  const latestLog = battle.actionLog.slice(-14).reverse()
  const canAct =
    !run.pendingVerdict &&
    !run.pendingReward &&
    !run.pendingRedInk &&
    run.status === 'active' &&
    battle.phase === 'player_turn' &&
    battle.result.status === 'ongoing'

  function playCard(card: CardInstance) {
    setViewState((current) => {
      const currentEnemy = current.battle.enemies[0]

      if (
        !currentEnemy ||
        current.run.pendingVerdict ||
        current.run.pendingReward ||
        current.run.pendingRedInk ||
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

  function endTurn() {
    setViewState((current) => {
      if (
        current.run.pendingReward ||
        current.run.pendingVerdict ||
        current.run.pendingRedInk ||
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
      if (current.run.pendingVerdict || current.run.pendingReward || current.run.pendingRedInk) {
        return current
      }

      const encounter = getCurrentTutorialEncounter(current.run, gameData.encounters)

      if (!encounter) {
        return createInitialTutorialBattleView()
      }

      return {
        ...current,
        battle: createBattleForEncounter(encounter, current.run),
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

      if (
        current.run.pendingVerdict ||
        current.run.pendingReward ||
        current.run.pendingRedInk ||
        current.run.status !== 'active' ||
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
      )

      return {
        run: nextRun,
        battle: current.battle,
      }
    })
  }

  function chooseReward(cardDefinitionId?: string) {
    setViewState((current) => {
      const nextRun = resolveTutorialReward(current.run, cardDefinitionId)
      const nextEncounter = getCurrentTutorialEncounter(nextRun, gameData.encounters)

      return {
        run: nextRun,
        battle: nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
          : current.battle,
      }
    })
  }

  function chooseVerdict(choiceId: TutorialVerdictChoiceId) {
    setViewState((current) => {
      const nextRun = resolveTutorialVerdict(current.run, choiceId)
      const nextEncounter = getCurrentTutorialEncounter(nextRun, gameData.encounters)

      return {
        run: nextRun,
        battle: nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
          : current.battle,
      }
    })
  }

  function applyRedInk(deckCardId?: RunDeckCardId, annotationId?: RedInkAnnotationId) {
    setViewState((current) => {
      const nextRun =
        deckCardId && annotationId
          ? resolveTutorialRedInk(current.run, { deckCardId, annotationId })
          : resolveTutorialRedInk(current.run)
      const nextEncounter = getCurrentTutorialEncounter(nextRun, gameData.encounters)

      return {
        run: nextRun,
        battle: nextEncounter && !hasPendingRunChoice(nextRun)
          ? createBattleForEncounter(nextEncounter, nextRun)
          : current.battle,
      }
    })
  }

  return (
    <aside className="battle-hud" aria-label="前三场教学战">
      <header className="hud-header">
        <div>
          <p className="panel-kicker">教学纵切 / T13</p>
          <h2>{currentEncounter ? t(currentEncounter.nameKey) : getRunHeadline(run.status)}</h2>
        </div>
        <div className="dev-controls">
          <button
            className="ghost-button"
            type="button"
            onClick={restartCurrentBattle}
          >
            重开当前战斗
          </button>
          <button className="ghost-button" type="button" onClick={restartTutorialRun}>
            重开教学纵切
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

      {battle.result.status === 'victory' && run.status === 'active' && !hasPendingRunChoice(run) ? (
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

      {battle.result.status === 'defeat' && run.status === 'active' ? (
        <section className="result-banner run-failed" aria-live="polite">
          <span>失败</span>
          <strong>本场战斗已经失败。</strong>
          <p>进入最小结算页，保留本局已经完成的伏诛、归册、奖励和裁定记录。</p>
          <div className="result-actions">
            <button type="button" onClick={settleBattleDefeat}>
              查看结算
            </button>
          </div>
        </section>
      ) : null}

      {run.pendingVerdict ? (
        <VerdictPage
          offer={run.pendingVerdict}
          t={t}
          verdict={run.verdict}
          onChoose={chooseVerdict}
        />
      ) : null}

      {!run.pendingVerdict && run.pendingRedInk ? (
        <RedInkPage
          cardDefinitionsById={cardDefinitionsById}
          deckCards={run.deckCards}
          offer={run.pendingRedInk}
          t={t}
          onApply={applyRedInk}
          onSkip={() => applyRedInk()}
        />
      ) : null}

      {!run.pendingVerdict && !run.pendingRedInk && run.pendingReward ? (
        <RewardPage
          cardDefinitionsById={cardDefinitionsById}
          offer={run.pendingReward}
          t={t}
          onChooseCard={chooseReward}
          onSkip={() => chooseReward()}
        />
      ) : null}

      {run.status !== 'active' && !hasPendingRunChoice(run) ? (
        <RunSummaryPage summary={runSummary} onRestart={restartTutorialRun} />
      ) : null}

      {enemy ? <EnemyPanel enemy={enemy} /> : null}
      {pressureFeedback ? <PressureFeedbackPanel feedback={pressureFeedback} /> : null}

      <section className="hud-section">
        <div className="section-title-row">
          <h3>案前</h3>
          <span className="turn-pill">第 {battle.turn} 回合</span>
        </div>
        <div className="resource-grid" aria-label="玩家资源">
          <Metric label="香火" value={`${battle.player.incense} / ${battle.player.maxIncense}`} />
          <Metric label="抽牌堆" value={battle.drawPile.length.toString()} />
          <Metric label="弃牌堆" value={battle.discardPile.length.toString()} />
          <Metric label="消耗区" value={battle.exhaustPile.length.toString()} />
        </div>
      </section>

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
              const isDisabled = !canAct || !definition || !isAffordable

              return (
                <button
                  className="card-button"
                  disabled={isDisabled}
                  key={card.instanceId}
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
                        <span key={label}>{label}</span>
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
                </button>
              )
            })
          ) : (
            <p className="empty-state">案上暂无手牌。</p>
          )}
        </div>
      </section>

      <footer className="hud-actions">
        <button type="button" disabled={!canAct} onClick={endTurn}>
          结束回合
        </button>
      </footer>

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
    </aside>
  )
}

function TutorialRunPanel({
  run,
  currentEncounter,
}: {
  readonly run: TutorialRunState
  readonly currentEncounter?: EncounterDefinition
}) {
  return (
    <section className="tutorial-run-panel" aria-label="教学战进度">
      <div className="section-title-row">
        <h3>前三场教学战</h3>
        <span>{getRunProgressLabel(run)}</span>
      </div>
      <ol className="tutorial-steps">
        {run.encounterIds.map((encounterId, index) => {
          const encounter = getEncounterDefinition(encounterId)
          const settlement = run.settlements.find((record) => record.encounterId === encounterId)
          const isCurrent = currentEncounter?.id === encounterId
          const isDone = run.completedEncounterIds.includes(encounterId)

          return (
            <li
              className={isDone ? 'done' : isCurrent ? 'current' : 'locked'}
              key={encounterId}
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
        <span>牌组 {run.deckCards.length} 张</span>
        <span>榜裂 {run.verdict.fracture}</span>
        <span>登簿 {run.verdict.registerEntries.length}</span>
        <span>裁定 {run.verdict.records.length} 次</span>
        <span>已领奖励 {run.rewards.length} 次</span>
        <span>朱批 {run.redInkRecords.filter((record) => !record.skipped).length} 次</span>
        {run.pendingVerdict ? <span>待裁定</span> : null}
        {run.pendingReward ? <span>待选奖励</span> : null}
        {run.pendingRedInk ? <span>待朱批</span> : null}
      </div>
    </section>
  )
}

function EnemyPanel({ enemy }: { readonly enemy: EnemyState }) {
  const formPercent = Math.max(0, Math.min(100, (enemy.currentForm / enemy.maxForm) * 100))
  const intentLabel = enemy.currentIntent ? t(enemy.currentIntent.nameKey) : '无'
  const abnormalMove = getCurrentAbnormalMove(enemy)
  const hasPreparedCounter = abnormalMove
    ? enemy.blockedAbnormalMoveTypes.includes(abnormalMove.type)
    : false
  const intentKind =
    enemy.currentIntent?.kind === 'abnormal_move'
      ? '异动'
      : enemy.currentIntent?.kind === 'incoming_force'
        ? '来势'
        : '待定'
  const intentTone =
    enemy.currentIntent?.kind === 'abnormal_move'
      ? 'abnormal'
      : enemy.incomingForce > 0
        ? 'incoming'
        : 'quiet'

  return (
    <section className="enemy-panel" aria-label="敌人状态">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">敌形（形）</p>
          <h3>{getEnemyDefinitionName(enemy.definitionId)}</h3>
        </div>
        <span className={enemy.isNamed ? 'status-pill named' : 'status-pill'}>
          {enemy.isNamed ? '正名' : '未正名'}
        </span>
      </div>

      <div className="form-meter" aria-label={`形 ${enemy.currentForm} / ${enemy.maxForm}`}>
        <span style={{ width: `${formPercent}%` }} />
      </div>
      <div className="form-row">
        <span>形</span>
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

      <div className={`intent-banner ${intentTone}`} aria-label="敌人下一次行动">
        <span>{intentKind === '来势' ? '直接冲击（来势）' : intentKind === '异动' ? '特殊行为（异动）' : '行动'}</span>
        <strong>{intentLabel}</strong>
        <small>
          {abnormalMove
            ? hasPreparedCounter
              ? '专门处理已布置'
              : '需要专门效果处理'
            : enemy.incomingForce > 0
              ? '可被封势降低'
              : '暂无直接来势'}
        </small>
      </div>
      <div className="intent-detail-grid" aria-label="敌人意图详情">
        <div>
          <span>当前来势值</span>
          <strong>{enemy.incomingForce}</strong>
        </div>
        <div className={abnormalMove ? 'intent-alert active' : 'intent-alert'}>
          <span>异动预警</span>
          <strong>{abnormalMove ? t(abnormalMove.descriptionKey) : '无'}</strong>
        </div>
      </div>
      <div className="intent-rule-grid" aria-label="来势与异动处理状态">
        <div className={enemy.incomingForce > 0 ? 'rule-note active' : 'rule-note'}>
          <span>压住来势（封势）</span>
          <strong>
            {enemy.incomingForce > 0
              ? `可处理 ${enemy.incomingForce} 点`
              : abnormalMove
                ? '本次不是来势'
                : '暂无来势'}
          </strong>
        </div>
        <div
          className={
            abnormalMove ? (hasPreparedCounter ? 'rule-note secured' : 'rule-note danger') : 'rule-note'
          }
        >
          <span>专门处理（断异动）</span>
          <strong>
            {abnormalMove
              ? hasPreparedCounter
                ? `已盯住${getMoveLabel(abnormalMove.type)}`
                : `${getMoveLabel(abnormalMove.type)}未处理`
              : '暂无异动'}
          </strong>
        </div>
      </div>
    </section>
  )
}

function PressureFeedbackPanel({ feedback }: { readonly feedback: PressureFeedback }) {
  return (
    <section className={`pressure-feedback ${feedback.tone}`} aria-live="polite">
      <span>{feedback.label}</span>
      <strong>{feedback.title}</strong>
      <p>{feedback.detail}</p>
    </section>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function createCardDefinitionMap(cards: readonly CardDefinition[]) {
  return new Map(cards.map((card) => [card.id, card]))
}

function createCardInstanceMap(cards: readonly CardInstance[]) {
  return new Map(cards.map((card) => [card.instanceId, card]))
}

function createInitialTutorialBattleView(): TutorialBattleViewState {
  const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
  const encounter = getCurrentTutorialEncounter(run, gameData.encounters)

  if (!encounter) {
    throw new Error('Missing first tutorial encounter')
  }

  return {
    run,
    battle: createBattleForEncounter(encounter, run),
  }
}

function createBattleForEncounter(
  encounter: EncounterDefinition,
  run: TutorialRunState,
) {
  return createBattle(
    getEnemyDefinition(encounter.enemyDefinitionId),
    run.unlocks,
    run.deckCards,
    run.verdict.maxIncenseBonus,
  )
}

function hasPendingRunChoice(run: TutorialRunState) {
  return Boolean(run.pendingVerdict || run.pendingRedInk || run.pendingReward)
}

function getRevealedNameKeys(enemy: EnemyState) {
  return enemy.nameSlots
    .filter((slot) => slot.isRevealed && slot.nameKey)
    .map((slot) => slot.nameKey as string)
}

function getEncounterDefinition(encounterId: string) {
  const encounter = encounterDefinitionsById.get(encounterId)

  if (!encounter) {
    throw new Error(`Missing encounter definition: ${encounterId}`)
  }

  return encounter
}

function getEnemyDefinition(definitionId: string) {
  const enemy = enemyDefinitionsById.get(definitionId)

  if (!enemy) {
    throw new Error(`Missing enemy definition: ${definitionId}`)
  }

  return enemy
}

function getUnlockStageName(stageId: string) {
  const stage = gameData.tutorialUnlocks.find((candidate) => candidate.id === stageId)

  return stage ? t(stage.nameKey) : stageId
}

function getRunHeadline(status: TutorialRunState['status']) {
  if (status === 'complete') {
    return '纵切完成'
  }

  if (status === 'failed') {
    return '纵切中止'
  }

  return '前三战进行中'
}

function getRunProgressLabel(run: TutorialRunState) {
  if (run.status === 'complete') {
    return '已完成'
  }

  if (run.status === 'failed') {
    return '已中止'
  }

  return `第 ${run.currentEncounterIndex + 1} / ${run.encounterIds.length} 场`
}

function isFinalEncounter(run: TutorialRunState) {
  return run.currentEncounterIndex >= run.encounterIds.length - 1
}

function getCurrentAbnormalMove(enemy: EnemyState): AbnormalMoveDefinition | undefined {
  return enemy.currentIntent?.effects.find((effect) => effect.type === 'ABNORMAL_MOVE')?.move
}

function createPressureFeedback(
  battle: CombatState,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
): PressureFeedback | undefined {
  const entry = battle.actionLog
    .slice()
    .reverse()
    .find((candidate) =>
      [
        'INCOMING_FORCE_SEALED',
        'ABNORMAL_MOVE_COUNTERED',
        'ABNORMAL_MOVE_EXECUTED',
        'INCOMING_FORCE_CREATED',
      ].includes(candidate.type),
    )

  if (!entry) {
    return undefined
  }

  const sourceCardName = getCardName(entry.sourceId, cardDefinitionsById, allCardsByInstanceId)
  const sourceName = sourceCardName ?? sourceEnemyName(entry.sourceId, battle) ?? '敌方'

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0
    const remaining = getPayloadNumber(entry.payload.remainingIncomingForce) ?? 0

    return {
      tone: 'sealed',
      label: '封势反馈',
      title: amount > 0 ? `${sourceName}压住 ${amount} 点来势` : `${sourceName}未压住来势`,
      detail: amount > 0 ? `敌方当前剩余来势 ${remaining}。` : '当前没有可被封势处理的直接来势。',
    }
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    const moveLabel = getMoveLabel(getPayloadString(entry.payload.moveType))
    const result = getPayloadString(entry.payload.result)

    return {
      tone: 'countered',
      label: result === 'prevented' ? '断异动成功' : '断异动已布置',
      title:
        result === 'prevented'
          ? `${moveLabel}已被专门效果处理`
          : `${sourceName}准备处理${moveLabel}`,
      detail:
        result === 'prevented'
          ? '本次异动没有生效。'
          : '敌人行动时若发动对应异动，会被这次布置阻止。',
    }
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    const moveLabel = getMoveLabel(getPayloadString(entry.payload.moveType))
    const incensePenalty = getPayloadNumber(entry.payload.nextTurnIncensePenalty) ?? 0

    return {
      tone: 'abnormal',
      label: '异动生效',
      title: `${sourceName}发动${moveLabel}`,
      detail:
        incensePenalty > 0
          ? `下回合香火将受扰 -${incensePenalty}。`
          : '本次异动已经结算。',
    }
  }

  const amount = getPayloadNumber(entry.payload.amount) ?? 0

  return {
    tone: 'incoming',
    label: '来势结算',
    title: amount > 0 ? `${sourceName}来势 ${amount}` : '来势已被压住',
    detail: amount > 0 ? '未被封掉的来势进入敌方行动结算。' : '敌人的直接来势没有形成压力。',
  }
}

function formatLogEntry(
  entry: ActionLogEntry,
  battle: CombatState,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
) {
  const sourceCardName = getCardName(entry.sourceId, cardDefinitionsById, allCardsByInstanceId)
  const targetEnemyName = getEnemyName(entry.targetId, battle)

  if (entry.type === 'BATTLE_STARTED') {
    return `开战：${targetEnemyName ?? '纸面鬼'}入案。`
  }

  if (entry.type === 'TURN_STARTED') {
    return `第 ${entry.turn} 回合开始。`
  }

  if (entry.type === 'TURN_ENDED') {
    return `第 ${entry.turn} 回合结束。`
  }

  if (entry.type === 'CARD_DRAWN') {
    return `抽入：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'CARD_PLAYED') {
    return `出牌：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'CARD_ANNOTATION_TRIGGERED') {
    return `朱批触发：${t(getPayloadString(entry.payload.nameKey))}。`
  }

  if (entry.type === 'CARD_PLAY_REJECTED') {
    return getPayloadString(entry.payload.reason) === 'not_enough_incense'
      ? '香火不足，未能出牌。'
      : '当前不能出牌。'
  }

  if (entry.type === 'CARD_DISCARDED') {
    return `弃置：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'CARD_EXHAUSTED') {
    return `移入消耗区：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'PILE_SHUFFLED') {
    return `弃牌堆回洗，共 ${getPayloadNumber(entry.payload.count) ?? 0} 张。`
  }

  if (entry.type === 'INCENSE_GAINED') {
    const incensePenalty = getPayloadNumber(entry.payload.incensePenalty) ?? 0

    if (incensePenalty > 0) {
      return `香火受扰 -${incensePenalty}，本回合获得 ${
        getPayloadNumber(entry.payload.amount) ?? 0
      }，当前 ${getPayloadNumber(entry.payload.currentIncense) ?? 0}。`
    }

    return `香火 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
      getPayloadNumber(entry.payload.currentIncense) ?? 0
    }。`
  }

  if (entry.type === 'INCENSE_SPENT') {
    return `香火 -${getPayloadNumber(entry.payload.amount) ?? 0}，余 ${
      getPayloadNumber(entry.payload.currentIncense) ?? 0
    }。`
  }

  if (entry.type === 'FORM_BROKEN') {
    return `${sourceCardName ?? '符诏'}破形 ${getPayloadNumber(entry.payload.amount) ?? 0}，${
      targetEnemyName ?? '敌方'
    }余形 ${getPayloadNumber(entry.payload.currentForm) ?? 0}。`
  }

  if (entry.type === 'NAME_ASKED') {
    return getPayloadString(entry.payload.result) === 'discern_intent'
      ? `${sourceCardName ?? '问名'}转为辨势。`
      : `${sourceCardName ?? '问名'}查明真名（问名）。`
  }

  if (entry.type === 'NAME_SLOT_REVEALED') {
    return `名格显现：${t(getPayloadString(entry.payload.nameKey))}。`
  }

  if (entry.type === 'ENEMY_NAMED') {
    return `${targetEnemyName ?? '敌方'}真名已明（正名）。`
  }

  if (entry.type === 'NAME_BREAK_TRIGGERED') {
    return `名破 ${getPayloadNumber(entry.payload.amount) ?? 0}，余形 ${
      getPayloadNumber(entry.payload.currentForm) ?? 0
    }。`
  }

  if (entry.type === 'INCOMING_FORCE_CREATED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0

    return amount > 0
      ? `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}来势结算 ${amount}。`
      : `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}来势已被完全压住。`
  }

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0
    const remaining = getPayloadNumber(entry.payload.remainingIncomingForce) ?? 0

    return amount > 0
      ? `${sourceCardName ?? '符诏'}封势 ${amount}，剩余来势 ${remaining}。`
      : `${sourceCardName ?? '符诏'}封势未生效：当前没有可压住的来势。`
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    const incensePenalty = getPayloadNumber(entry.payload.nextTurnIncensePenalty) ?? 0

    return `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}发动异动：${getMoveLabel(
      getPayloadString(entry.payload.moveType),
    )}${incensePenalty > 0 ? `，下回合香火受扰 -${incensePenalty}` : ''}。`
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    const result = getPayloadString(entry.payload.result)

    return result === 'prevented'
      ? `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}的${getMoveLabel(
          getPayloadString(entry.payload.moveType),
        )}被断异动阻止。`
      : `${sourceCardName ?? '符诏'}准备断异动：${getMoveLabel(
          getPayloadString(entry.payload.moveType),
        )}。`
  }

  if (entry.type === 'VICTORY_SETTLED') {
    const settlement = getPayloadString(entry.payload.settlement) as VictorySettlement | undefined
    return `战斗结算：${settlement ? getSettlementLabel(settlement) : '已结算'}。`
  }

  return entry.type
}

function getCardName(
  sourceId: string | undefined,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
) {
  if (!sourceId) {
    return undefined
  }

  const instance = allCardsByInstanceId.get(sourceId)
  const definition = instance ? cardDefinitionsById.get(instance.definitionId) : undefined

  return definition ? t(definition.nameKey) : undefined
}

function getCardNameFromPayload(
  entry: ActionLogEntry,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
) {
  const cardDefinitionId = getPayloadString(entry.payload.cardDefinitionId)
  const definition = cardDefinitionId ? cardDefinitionsById.get(cardDefinitionId) : undefined

  return definition ? t(definition.nameKey) : '未知牌'
}

function getEnemyName(targetId: string | undefined, battle: CombatState) {
  if (!targetId) {
    return undefined
  }

  const enemy = battle.enemies.find((candidate) => candidate.instanceId === targetId)

  return enemy ? getEnemyDefinitionName(enemy.definitionId) : undefined
}

function sourceEnemyName(sourceId: string | undefined, battle: CombatState) {
  return getEnemyName(sourceId, battle)
}

function getPayloadNumber(value: JsonValue | undefined) {
  return typeof value === 'number' ? value : undefined
}

function getPayloadString(value: JsonValue | undefined) {
  return typeof value === 'string' ? value : undefined
}

function getCardEffectLabels(definition: CardDefinition, card?: CardInstance) {
  const effects = [
    ...definition.effects,
    ...(card?.annotations.flatMap((annotation) => annotation.effects) ?? []),
  ]

  return Array.from(
    new Set(
      effects.map((effect) => {
        if (effect.type === 'BREAK_SHAPE') {
          return '破形'
        }

        if (effect.type === 'ASK_NAME') {
          return '问名'
        }

        if (effect.type === 'SEAL_MOMENTUM') {
          return '封势'
        }

        if (effect.type === 'COUNTER_ABNORMAL_MOVE') {
          return '断异动'
        }

        if (effect.type === 'DRAW') {
          return '抽牌'
        }

        return '香火'
      }),
    ),
  )
}

function getLogEntryClassName(entry: ActionLogEntry) {
  if (entry.type === 'INCOMING_FORCE_CREATED') {
    return 'log-entry incoming'
  }

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    return 'log-entry sealed'
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    return 'log-entry abnormal'
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    return 'log-entry countered'
  }

  if (entry.type === 'FORM_BROKEN' || entry.type === 'NAME_BREAK_TRIGGERED') {
    return 'log-entry form'
  }

  if (
    entry.type === 'NAME_ASKED' ||
    entry.type === 'NAME_SLOT_REVEALED' ||
    entry.type === 'ENEMY_NAMED' ||
    entry.type === 'CARD_ANNOTATION_TRIGGERED'
  ) {
    return 'log-entry name'
  }

  return 'log-entry'
}

function getSettlementLabel(settlement: VictorySettlement) {
  return settlement === 'catalogue' ? '归册' : '伏诛'
}

function getSettlementText(settlement: VictorySettlement) {
  return settlement === 'catalogue'
    ? '真名入卷，先入裁定，再领取高质量奖励。'
    : '敌形已散，获得普通奖励。'
}

function getMoveLabel(moveType: string | undefined) {
  if (moveType === 'steal_incense') {
    return '偷香'
  }

  if (moveType === 'add_fouled_scroll') {
    return '塞污卷'
  }

  return moveType ?? '异动'
}

function getEnemyDefinitionName(definitionId: string) {
  const definition = enemyDefinitionsById.get(definitionId)

  return definition ? t(definition.nameKey) : definitionId
}

function t(key: string | undefined) {
  if (!key) {
    return '未记名'
  }

  return gameData.localization[key] ?? key
}
