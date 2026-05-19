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
  const qualityLabel = offer.quality === 'high' ? '归册高质奖励' : '伏诛普通奖励'
  const qualityText =
    offer.quality === 'high'
      ? '真名已明，奖励池多开一格，并可出现归册限定牌。'
      : '敌形已散，奖励池保留基础成长。'

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
                <span>{definition?.cost ?? '?'} 香火</span>
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
