import { useMemo, useState } from 'react'
import {
  createInitialBattleState,
  reduceBattleState,
  type BattleReducerContext,
} from '../../core'
import { gameData } from '../../data'
import type {
  ActionLogEntry,
  CardDefinition,
  CardInstance,
  CombatState,
  EnemyState,
  JsonValue,
  VictorySettlement,
} from '../../types'

const battleContext: BattleReducerContext = {
  cardDefinitions: gameData.cards,
  enemyDefinitions: gameData.enemies,
}

const enemyDefinitionsById = new Map(gameData.enemies.map((enemy) => [enemy.id, enemy]))
const startingEnemy = getStartingEnemy()

function createBattle() {
  return createInitialBattleState({
    cardDefinitions: gameData.cards,
    enemyDefinition: startingEnemy,
  })
}

export function BattleHud() {
  const [battle, setBattle] = useState(createBattle)
  const enemy = battle.enemies[0]
  const cardDefinitionsById = useMemo(() => createCardDefinitionMap(gameData.cards), [])
  const allCardsByInstanceId = useMemo(() => createCardInstanceMap(battle.player.deck), [battle])
  const latestLog = battle.actionLog.slice(-14).reverse()
  const canAct = battle.phase === 'player_turn' && battle.result.status === 'ongoing'

  function playCard(card: CardInstance) {
    if (!enemy || !canAct) {
      return
    }

    setBattle((current) =>
      reduceBattleState(
        current,
        {
          type: 'PLAY_CARD',
          cardInstanceId: card.instanceId,
          targetEnemyInstanceId: enemy.instanceId,
        },
        battleContext,
      ),
    )
  }

  function endTurn() {
    if (!canAct) {
      return
    }

    setBattle((current) =>
      reduceBattleState(
        current,
        {
          type: 'END_TURN',
        },
        battleContext,
      ),
    )
  }

  function restartBattle() {
    setBattle(createBattle())
  }

  return (
    <aside className="battle-hud" aria-label="测试战斗">
      <header className="hud-header">
        <div>
          <p className="panel-kicker">残榜试战</p>
          <h2>纸面鬼</h2>
        </div>
        <button className="ghost-button" type="button" onClick={restartBattle}>
          新开测试战斗
        </button>
      </header>

      {battle.result.status === 'victory' ? (
        <section className="result-banner" aria-live="polite">
          <span>{getSettlementLabel(battle.result.settlement)}</span>
          <strong>{getSettlementText(battle.result.settlement)}</strong>
        </section>
      ) : null}

      {enemy ? <EnemyPanel enemy={enemy} /> : null}

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
            <li key={entry.id}>
              {formatLogEntry(entry, battle, cardDefinitionsById, allCardsByInstanceId)}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}

function EnemyPanel({ enemy }: { readonly enemy: EnemyState }) {
  const formPercent = Math.max(0, Math.min(100, (enemy.currentForm / enemy.maxForm) * 100))
  const intentLabel = enemy.currentIntent ? t(enemy.currentIntent.nameKey) : '无'
  const intentKind =
    enemy.currentIntent?.kind === 'abnormal_move'
      ? '异动'
      : enemy.currentIntent?.kind === 'incoming_force'
        ? '来势'
        : '待定'

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

      <div className="intent-row">
        <span>{intentKind}</span>
        <strong>{intentLabel}</strong>
      </div>
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

function getStartingEnemy() {
  const enemy = gameData.enemies.find((candidate) => candidate.id === 'enemy_paper_wraith')

  if (!enemy) {
    throw new Error('Missing T05 starting enemy: enemy_paper_wraith')
  }

  return enemy
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
    return `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}来势 ${
      getPayloadNumber(entry.payload.amount) ?? 0
    }。`
  }

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    return `${sourceCardName ?? '符诏'}封势 ${getPayloadNumber(entry.payload.amount) ?? 0}。`
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    return `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}发动异动。`
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

function getSettlementLabel(settlement: VictorySettlement) {
  return settlement === 'catalogue' ? '归册' : '伏诛'
}

function getSettlementText(settlement: VictorySettlement) {
  return settlement === 'catalogue' ? '真名入卷，奖励质量提高。' : '敌形已散，获得普通奖励。'
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
