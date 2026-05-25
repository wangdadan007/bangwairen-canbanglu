import { useState } from 'react'
import type {
  ArtifactDefinition,
  CardDefinition,
  CardId,
  IncenseSealDefinition,
  IncenseSealId,
  IncenseSealInstanceId,
  RouteDefinition,
  RouteState,
  RunDeckCard,
  RunDeckCardId,
  TutorialRunState,
  TutorialShopItemDefinition,
} from '../../types'
import { RunReadinessPanel } from './RunReadinessPanel'

export interface ShopPageProps {
  readonly items: readonly TutorialShopItemDefinition[]
  readonly deckCards: readonly RunDeckCard[]
  readonly artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly incenseSealDefinitionsById: ReadonlyMap<IncenseSealId, IncenseSealDefinition>
  readonly route: RouteDefinition
  readonly routeState: RouteState
  readonly run: TutorialRunState
  readonly t: (key: string | undefined) => string
  readonly onBuy: (
    itemId: string,
    deckCardId?: RunDeckCardId,
    replaceIncenseSealInstanceId?: IncenseSealInstanceId,
  ) => void
  readonly onLeave: () => void
}

export function ShopPage({
  items,
  deckCards,
  artifactDefinitionsById,
  cardDefinitionsById,
  incenseSealDefinitionsById,
  route,
  routeState,
  run,
  t,
  onBuy,
  onLeave,
}: ShopPageProps) {
  const [selectedDeckCardId, setSelectedDeckCardId] = useState(deckCards[0]?.id ?? '')
  const [selectedIncenseSealId, setSelectedIncenseSealId] = useState(
    run.incenseSeals.seals[0]?.id ?? '',
  )
  const selectedCard = deckCards.find((card) => card.id === selectedDeckCardId)
  const selectedIncenseSeal = run.incenseSeals.seals.find(
    (seal) => seal.id === selectedIncenseSealId,
  )

  return (
    <section className="shop-page" aria-label="商店页">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">商店</p>
          <h3>纸钱小肆</h3>
        </div>
        <span>{items.length} 件商品</span>
      </div>
      <p className="shop-copy">用香火钱买卡、删牌或临时朱批，商品只显示已解锁机制。</p>

      <div className="shop-state-row" aria-label="商店相关状态">
        <span>香火钱 {run.currency.incenseMoney}</span>
        <span>牌组 {deckCards.length} 张</span>
        <span>已购 {run.shops.records.length} 次</span>
        <span>
          香封 {run.incenseSeals.seals.length} / {run.incenseSeals.maxSlots}
        </span>
        <span>墨 {run.resources.ink}</span>
        <span>劫数 {run.resources.doom}</span>
        <span>榜裂 {run.resources.fracture}</span>
        <span>朱批 {run.redInkRecords.filter((record) => !record.skipped).length} 次</span>
      </div>

      <RunReadinessPanel
        artifactDefinitionsById={artifactDefinitionsById}
        cardDefinitionsById={cardDefinitionsById}
        context="shop"
        incenseSealDefinitionsById={incenseSealDefinitionsById}
        route={route}
        routeState={routeState}
        run={run}
        t={t}
      />

      <div className="shop-layout">
        <div className="shop-column">
          <h4>牌册</h4>
          <div className="shop-deck-list">
            {deckCards.map((deckCard, index) => {
              const definition = cardDefinitionsById.get(deckCard.definitionId)
              const isSelected = deckCard.id === selectedDeckCardId

              return (
                <button
                  className={isSelected ? 'shop-deck-card selected' : 'shop-deck-card'}
                  key={`${deckCard.id}_${index}`}
                  type="button"
                  onClick={() => setSelectedDeckCardId(deckCard.id)}
                >
                  <span>
                    {index + 1}. {definition ? t(definition.nameKey) : deckCard.definitionId}
                  </span>
                  <small>
                    {deckCard.annotations.length > 0
                      ? deckCard.annotations.map((annotation) => t(annotation.nameKey)).join(' / ')
                      : '未朱批'}
                  </small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="shop-column">
          <h4>商品</h4>
          {run.incenseSeals.seals.length >= run.incenseSeals.maxSlots ? (
            <div className="shop-seal-replace" aria-label="香封替换选择">
              <span>香封槽已满，购买新香封会替换：</span>
              <select
                value={selectedIncenseSealId}
                onChange={(event) => setSelectedIncenseSealId(event.target.value)}
              >
                {run.incenseSeals.seals.map((seal) => {
                  const definition = incenseSealDefinitionsById.get(seal.definitionId)

                  return (
                    <option key={seal.id} value={seal.id}>
                      {definition ? t(definition.nameKey) : seal.definitionId}
                    </option>
                  )
                })}
              </select>
            </div>
          ) : null}
          <div className="shop-item-list">
            {items.map((item) => {
              const isRemoveCard = item.kind === 'remove_card'
              const isIncenseSeal = item.kind === 'incense_seal'
              const canAfford = run.currency.incenseMoney >= item.cost
              const canChoose =
                canAfford &&
                (!isRemoveCard || Boolean(selectedCard)) &&
                (!isIncenseSeal ||
                  run.incenseSeals.seals.length < run.incenseSeals.maxSlots ||
                  Boolean(selectedIncenseSeal))
              const disabledReason = canChoose
                ? undefined
                : getShopDisabledReason({
                    item,
                    isRemoveCard,
                    isIncenseSeal,
                    canAfford,
                    selectedCard,
                    selectedIncenseSeal,
                  })

              return (
                <button
                  className={item.kind === 'red_ink_service' ? 'shop-item red-ink' : 'shop-item'}
                  disabled={!canChoose}
                  key={item.id}
                  title={disabledReason}
                  type="button"
                  onClick={() =>
                    isRemoveCard
                      ? selectedCard && onBuy(item.id, selectedCard.id)
                      : isIncenseSeal &&
                          run.incenseSeals.seals.length >= run.incenseSeals.maxSlots
                        ? onBuy(item.id, undefined, selectedIncenseSeal?.id)
                        : onBuy(item.id)
                  }
                >
                  <span className="card-topline">
                    <strong>{t(item.nameKey)}</strong>
                    <span>{item.cost} 香火钱</span>
                  </span>
                  <span className="shop-item-copy">{t(item.descriptionKey)}</span>
                  <span className="card-tags">
                    {getItemLabels(
                      item,
                      selectedCard,
                      selectedIncenseSeal,
                      artifactDefinitionsById,
                      cardDefinitionsById,
                      incenseSealDefinitionsById,
                      t,
                    ).map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </span>
                  {disabledReason ? <span className="card-state">{disabledReason}</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="reward-actions">
        <button type="button" onClick={onLeave}>
          离开商店
        </button>
      </div>
    </section>
  )
}

function getShopDisabledReason({
  item,
  isRemoveCard,
  isIncenseSeal,
  canAfford,
  selectedCard,
  selectedIncenseSeal,
}: {
  readonly item: TutorialShopItemDefinition
  readonly isRemoveCard: boolean
  readonly isIncenseSeal: boolean
  readonly canAfford: boolean
  readonly selectedCard: RunDeckCard | undefined
  readonly selectedIncenseSeal: TutorialRunState['incenseSeals']['seals'][number] | undefined
}) {
  if (!canAfford) {
    return `香火钱不足：需要 ${item.cost}`
  }

  if (isRemoveCard && !selectedCard) {
    return '请先在牌册里选一张牌'
  }

  if (isIncenseSeal && !selectedIncenseSeal) {
    return '请先选择要替换的香封'
  }

  return '当前不能购买'
}

function getItemLabels(
  item: TutorialShopItemDefinition,
  selectedCard: RunDeckCard | undefined,
  selectedIncenseSeal: TutorialRunState['incenseSeals']['seals'][number] | undefined,
  artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>,
  cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>,
  incenseSealDefinitionsById: ReadonlyMap<IncenseSealId, IncenseSealDefinition>,
  t: (key: string | undefined) => string,
) {
  if (item.kind === 'card') {
    const definition = item.cardDefinitionId
      ? cardDefinitionsById.get(item.cardDefinitionId)
      : undefined

    return [`买卡：${definition ? t(definition.nameKey) : item.cardDefinitionId ?? '未知牌'}`]
  }

  if (item.kind === 'artifact') {
    const definition = item.artifactDefinitionId
      ? artifactDefinitionsById.get(item.artifactDefinitionId)
      : undefined

    return [`法宝：${definition ? t(definition.nameKey) : item.artifactDefinitionId ?? '未知器物'}`]
  }

  if (item.kind === 'remove_card') {
    const definition = selectedCard
      ? cardDefinitionsById.get(selectedCard.definitionId)
      : undefined

    return [`删牌：${definition ? t(definition.nameKey) : '请选择牌'}`]
  }

  if (item.kind === 'cleanse_service') {
    return ['清理污卷']
  }

  if (item.kind === 'artifact_maintenance_service') {
    return ['清除反噬']
  }

  if (item.kind === 'incense_seal') {
    const definition = item.incenseSealDefinitionId
      ? incenseSealDefinitionsById.get(item.incenseSealDefinitionId)
      : undefined
    const replaceDefinition = selectedIncenseSeal
      ? incenseSealDefinitionsById.get(selectedIncenseSeal.definitionId)
      : undefined

    return [
      `香封：${definition ? t(definition.nameKey) : item.incenseSealDefinitionId ?? '未知香封'}`,
      getIncenseSealRarityLabel(definition?.rarity),
      replaceDefinition ? `替换：${t(replaceDefinition.nameKey)}` : '占槽一次性',
    ]
  }

  return ['进入朱批']
}

function getIncenseSealRarityLabel(rarity: IncenseSealDefinition['rarity'] | undefined) {
  if (rarity === 'rare') {
    return '秘传'
  }

  if (rarity === 'uncommon') {
    return '精良'
  }

  return '普通'
}
