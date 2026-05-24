import type { CardDefinition, CardId, TutorialRewardOffer } from '../../types'
import { getTermTooltip } from './actionLogView'

export interface RewardPageProps {
  readonly offer: TutorialRewardOffer
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly t: (key: string | undefined) => string
  readonly onChooseCard: (cardDefinitionId: CardId) => void
  readonly onSkip: () => void
}

export function RewardPage({
  offer,
  cardDefinitionsById,
  t,
  onChooseCard,
  onSkip,
}: RewardPageProps) {
  const qualityLabel = offer.quality === 'high' ? '归册奖励' : '伏诛奖励'
  const qualityText =
    offer.quality === 'high'
      ? '卡牌奖励池与伏诛一致；归册的额外收益已在裁定中结算。'
      : '卡牌奖励池与归册一致；快速收束后仍可继续补问名、正名和构筑牌。'

  return (
    <section className={`reward-page ${offer.quality}`} aria-label="战后奖励">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">战后奖励</p>
          <h3>{qualityLabel}</h3>
        </div>
        <span>{offer.options.length} 选 1</span>
      </div>
      <p className="reward-copy">{qualityText}</p>
      <div className="shop-state-row" aria-label="战后香火钱">
        <span>香火钱 +{offer.incenseMoneyReward}</span>
        <span>奖励位：基础 / 倾向 / 惊喜</span>
      </div>

      <div className="reward-options">
        {offer.options.map((option) => {
          const definition = cardDefinitionsById.get(option.cardDefinitionId)

          return (
            <button
              className="reward-card"
              key={option.id}
              type="button"
              onClick={() => onChooseCard(option.cardDefinitionId)}
            >
              <span className="card-topline">
                <strong>{definition ? t(definition.nameKey) : option.cardDefinitionId}</strong>
                <span>
                  {getRarityLabel(definition?.rarity)} · {definition?.cost ?? '?'} 香火
                </span>
              </span>
              <span className="card-rules">
                {definition ? t(definition.rulesTextKey) : '缺少卡牌定义'}
              </span>
              {definition ? (
                <span className="card-tags">
                  {definition.tags
                    .filter((tag) => tag !== 'reward' && tag !== 'catalogue_reward')
                    .map((tag) => (
                      <span key={tag} title={getTagTooltip(tag)}>
                        {getTagLabel(tag)}
                      </span>
                    ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="reward-actions">
        <button className="ghost-button" type="button" onClick={onSkip}>
          跳过奖励
        </button>
      </div>
    </section>
  )
}

function getRarityLabel(rarity: CardDefinition['rarity'] | undefined) {
  if (rarity === 'rare') {
    return '秘传'
  }

  if (rarity === 'uncommon') {
    return '精良'
  }

  return '普通'
}

function getTagLabel(tag: string) {
  if (tag === 'break_form') {
    return '破形'
  }

  if (tag === 'ask_name') {
    return '问名'
  }

  if (tag === 'seal_momentum' || tag === 'incoming_force') {
    return '封势'
  }

  if (tag === 'counter_abnormal_move' || tag === 'abnormal_move') {
    return '断异动'
  }

  if (tag === 'red_ink_preview') {
    return '朱批入口'
  }

  if (tag === 'draw') {
    return '抽牌'
  }

  if (tag === 'gain_incense') {
    return '香火'
  }

  if (tag === 'exhaust') {
    return '消耗'
  }

  return tag
}

function getTagTooltip(tag: string) {
  if (tag === 'break_form') {
    return getTermTooltip('break_form')
  }

  if (tag === 'ask_name') {
    return getTermTooltip('ask_name')
  }

  if (tag === 'seal_momentum' || tag === 'incoming_force') {
    return getTermTooltip('seal_momentum')
  }

  if (tag === 'counter_abnormal_move' || tag === 'abnormal_move') {
    return getTermTooltip('counter_abnormal_move')
  }

  if (tag === 'ink') {
    return getTermTooltip('ink')
  }

  if (tag === 'doom') {
    return getTermTooltip('doom')
  }

  if (tag === 'fracture') {
    return getTermTooltip('fracture')
  }

  if (tag.includes('altar')) {
    return getTermTooltip('altar')
  }

  if (tag === 'artifact') {
    return getTermTooltip('artifact')
  }

  return tag
}
