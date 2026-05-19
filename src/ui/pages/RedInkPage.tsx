import { useState } from 'react'
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
  const [selectedDeckCardId, setSelectedDeckCardId] = useState(deckCards[0]?.id ?? '')
  const selectedCard = deckCards.find((card) => card.id === selectedDeckCardId)

  return (
    <section className="red-ink-page" aria-label="批改卡牌（朱批）">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">批改卡牌（朱批） / T11</p>
          <h3>给一张牌写入永久词条</h3>
        </div>
        <span>当前牌组 {deckCards.length} 张 / {offer.options.length} 种朱批</span>
      </div>
      <p className="reward-copy">
        从当前牌组选择一张已有牌，再选择一条朱批。未获得的卡牌不会出现在这里，被批改的牌会在后续战斗保留这个词条。
      </p>

      <div className="red-ink-grid">
        <div className="red-ink-column">
          <h4>当前牌组</h4>
          <div className="red-ink-card-list">
            {deckCards.map((deckCard, index) => {
              const definition = cardDefinitionsById.get(deckCard.definitionId)
              const isSelected = deckCard.id === selectedDeckCardId

              return (
                <button
                  className={isSelected ? 'red-ink-card selected' : 'red-ink-card'}
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

        <div className="red-ink-column">
          <h4>朱批词条</h4>
          <div className="red-ink-option-list">
            {offer.options.map((option) => (
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
              </button>
            ))}
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

      return '断异动'
    })
    .join(' / ')
}
