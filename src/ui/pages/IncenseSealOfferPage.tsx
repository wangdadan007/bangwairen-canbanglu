import type { IncenseSealDefinition, IncenseSealId, TutorialIncenseSealOffer } from '../../types'

export interface IncenseSealOfferPageProps {
  readonly offer: TutorialIncenseSealOffer
  readonly incenseSealDefinitionsById: ReadonlyMap<IncenseSealId, IncenseSealDefinition>
  readonly t: (key: string | undefined) => string
  readonly onChoose: (incenseSealDefinitionId: IncenseSealId) => void
  readonly onSkip: () => void
}

export function IncenseSealOfferPage({
  offer,
  incenseSealDefinitionsById,
  t,
  onChoose,
  onSkip,
}: IncenseSealOfferPageProps) {
  return (
    <section className="reward-page incense-seal-offer" aria-label="香封奖励">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">精英后补给</p>
          <h3>香封二选一</h3>
        </div>
        <span>{offer.options.length} 选 1</span>
      </div>
      <p className="reward-copy">
        香封是一次性战术资源，占用香封槽，战斗内使用后即消耗，不进入牌组。
      </p>

      <div className="reward-options">
        {offer.options.map((option) => {
          const definition = incenseSealDefinitionsById.get(option.incenseSealDefinitionId)

          return (
            <button
              className="reward-card incense-seal-card"
              key={option.id}
              type="button"
              onClick={() => onChoose(option.incenseSealDefinitionId)}
            >
              <span className="card-topline">
                <strong>{definition ? t(definition.nameKey) : option.incenseSealDefinitionId}</strong>
                <span>{getIncenseSealRarityLabel(definition?.rarity)}</span>
              </span>
              <span className="card-rules">
                {definition ? t(definition.rulesTextKey) : '缺少香封定义'}
              </span>
              <span className="card-tags">
                <span>{getTargetModeLabel(definition?.targetMode)}</span>
                <span>一次性</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="reward-actions">
        <button className="ghost-button" type="button" onClick={onSkip}>
          跳过香封
        </button>
      </div>
    </section>
  )
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

function getTargetModeLabel(targetMode: IncenseSealDefinition['targetMode'] | undefined) {
  return targetMode === 'selected_enemy' ? '需目标' : '无需目标'
}
