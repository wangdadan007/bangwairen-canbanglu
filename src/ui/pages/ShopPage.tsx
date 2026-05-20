import { useState } from 'react'
import type {
  ArtifactDefinition,
  CardDefinition,
  CardId,
  RunDeckCard,
  RunDeckCardId,
  TutorialRunState,
  TutorialShopItemDefinition,
} from '../../types'

export interface ShopPageProps {
  readonly items: readonly TutorialShopItemDefinition[]
  readonly deckCards: readonly RunDeckCard[]
  readonly artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly run: TutorialRunState
  readonly t: (key: string | undefined) => string
  readonly onBuy: (itemId: string, deckCardId?: RunDeckCardId) => void
  readonly onLeave: () => void
}

export function ShopPage({
  items,
  deckCards,
  artifactDefinitionsById,
  cardDefinitionsById,
  run,
  t,
  onBuy,
  onLeave,
}: ShopPageProps) {
  const [selectedDeckCardId, setSelectedDeckCardId] = useState(deckCards[0]?.id ?? '')
  const selectedCard = deckCards.find((card) => card.id === selectedDeckCardId)

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
        <span>墨 {run.resources.ink}</span>
        <span>劫数 {run.resources.doom}</span>
        <span>榜裂 {run.resources.fracture}</span>
        <span>朱批 {run.redInkRecords.filter((record) => !record.skipped).length} 次</span>
      </div>

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
                  key={deckCard.id}
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
          <div className="shop-item-list">
            {items.map((item) => {
              const isRemoveCard = item.kind === 'remove_card'
              const canAfford = run.currency.incenseMoney >= item.cost
              const canChoose = canAfford && (!isRemoveCard || Boolean(selectedCard))
              const disabledReason = canChoose
                ? undefined
                : getShopDisabledReason({
                    item,
                    isRemoveCard,
                    canAfford,
                    selectedCard,
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
                      artifactDefinitionsById,
                      cardDefinitionsById,
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
  canAfford,
  selectedCard,
}: {
  readonly item: TutorialShopItemDefinition
  readonly isRemoveCard: boolean
  readonly canAfford: boolean
  readonly selectedCard: RunDeckCard | undefined
}) {
  if (!canAfford) {
    return `香火钱不足：需要 ${item.cost}`
  }

  if (isRemoveCard && !selectedCard) {
    return '请先在牌册里选一张牌'
  }

  return '当前不能购买'
}

function getItemLabels(
  item: TutorialShopItemDefinition,
  selectedCard: RunDeckCard | undefined,
  artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>,
  cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>,
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

  return ['进入朱批']
}
