import { useState } from 'react'
import { getVisibleRedInkOptionsForDeckCard } from '../../core'
import type {
  CardDefinition,
  CardId,
  RedInkAnnotationId,
  RunDeckCard,
  RunDeckCardId,
  TutorialRedInkOffer,
} from '../../types'

export interface RedInkPageProps {
  readonly offer: TutorialRedInkOffer
  readonly deckCards: readonly RunDeckCard[]
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly t: (key: string | undefined) => string
  readonly onApply: (deckCardId: RunDeckCardId, annotationId: RedInkAnnotationId) => void
  readonly onSkip: () => void
}

export function RedInkPage({
  offer,
  deckCards,
  cardDefinitionsById,
  t,
  onApply,
  onSkip,
}: RedInkPageProps) {
  const [selectedDeckCardId, setSelectedDeckCardId] = useState(
    () =>
      deckCards.find((deckCard) => {
        const definition = cardDefinitionsById.get(deckCard.definitionId)
        return getVisibleRedInkOptionsForDeckCard(offer, deckCard, definition).length > 0
      })?.id ??
      deckCards[0]?.id ??
      '',
  )
  const selectedCard = deckCards.find((card) => card.id === selectedDeckCardId)
  const selectedCardDefinition = selectedCard
    ? cardDefinitionsById.get(selectedCard.definitionId)
    : undefined
  const visibleOptions = getVisibleRedInkOptionsForDeckCard(
    offer,
    selectedCard,
    selectedCardDefinition,
  )

  return (
    <section className="red-ink-page" aria-label="批改卡牌（朱批）">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">批改卡牌（朱批）</p>
          <h3>给一张牌写入永久词条</h3>
        </div>
        <span>
          当前牌组 {deckCards.length} 张 / 朱批 {visibleOptions.length}
        </span>
      </div>
      <p className="reward-copy">
        从当前牌组选择一张已有牌，确认它的定向朱批。未获得的卡牌不会出现在这里，被批改的牌会在后续战斗保留这个词条。
      </p>

      <div className="red-ink-grid">
        <div className="red-ink-column">
          <h4>当前牌组</h4>
          <div className="red-ink-card-list">
            {deckCards.map((deckCard, index) => {
              const definition = cardDefinitionsById.get(deckCard.definitionId)
              const isSelected = deckCard.id === selectedDeckCardId
              const cardVisibleOptions = getVisibleRedInkOptionsForDeckCard(
                offer,
                deckCard,
                definition,
              )

              return (
                <button
                  className={isSelected ? 'red-ink-card selected' : 'red-ink-card'}
                  key={`${deckCard.id}_${index}`}
                  type="button"
                  onClick={() => setSelectedDeckCardId(deckCard.id)}
                >
                  <span>
                    {index + 1}. {definition ? t(definition.nameKey) : deckCard.definitionId}
                  </span>
                  <small>
                    {getDeckCardRedInkLabel(deckCard, cardVisibleOptions, t)}
                  </small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="red-ink-column">
          <h4>朱批</h4>
          <div className="red-ink-option-list">
            {visibleOptions.map((option) => (
              <button
                className="red-ink-option"
                disabled={!selectedCard}
                key={option.id}
                type="button"
                onClick={() => selectedCard && onApply(selectedCard.id, option.id)}
              >
                <strong>{t(option.nameKey)}</strong>
                <span>{t(option.rulesTextKey)}</span>
                <small>{getEffectSummary(option.annotation)}</small>
                <em>写入此朱批</em>
              </button>
            ))}
            {visibleOptions.length === 0 ? (
              <p className="empty-list-copy">这张牌暂时不能写入新的朱批，换一张牌试试。</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="reward-actions">
        <button className="ghost-button" type="button" onClick={onSkip}>
          暂不朱批
        </button>
      </div>
    </section>
  )
}

function getDeckCardRedInkLabel(
  deckCard: RunDeckCard,
  visibleOptions: TutorialRedInkOffer['options'],
  t: (key: string | undefined) => string,
) {
  if (visibleOptions.length > 0) {
    return t(visibleOptions[0].nameKey)
  }

  if (deckCard.annotations.length > 0) {
    return deckCard.annotations.map((annotation) => t(annotation.nameKey)).join(' / ')
  }

  return '不可朱批'
}

function getEffectSummary(annotation: TutorialRedInkOffer['options'][number]['annotation']) {
  return annotation.effects
    .map((effect) => {
      if (effect.type === 'GAIN_INCENSE') {
        return `香火 +${effect.amount}`
      }

      if (effect.type === 'ASK_NAME') {
        return `问名 ${effect.amount}`
      }

      if (effect.type === 'DRAW') {
        return `抽 ${effect.count}`
      }

      if (effect.type === 'BREAK_SHAPE') {
        return `破形 ${effect.amount}`
      }

      if (effect.type === 'SEAL_MOMENTUM') {
        return `封势 ${effect.amount}`
      }

      if (effect.type === 'GAIN_INK') {
        return `墨 +${effect.amount}`
      }

      if (effect.type === 'GAIN_DOOM') {
        return `劫数 +${effect.amount}`
      }

      if (effect.type === 'APPLY_FIRE_MARK') {
        return `火印 +${effect.amount}`
      }

      if (effect.type === 'APPLY_THUNDER_LEAD') {
        return `雷引 +${effect.amount}`
      }

      if (effect.type === 'TRIGGER_FIRE_MARK') {
        return '触发火印'
      }

      return '断异动'
    })
    .join(' / ')
}
