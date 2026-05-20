import type { ArtifactDefinition, ArtifactId, TutorialArtifactOffer } from '../../types'

export interface ArtifactOfferPageProps {
  readonly offer: TutorialArtifactOffer
  readonly artifactDefinitionsById: ReadonlyMap<ArtifactId, ArtifactDefinition>
  readonly t: (key: string | undefined) => string
  readonly onChoose: (artifactDefinitionId: ArtifactId) => void
}

const stageCopy = {
  starter: {
    eyebrow: '开局法宝',
    title: '先择一件随身器物',
    body: '第一件法宝会陪你过完整个前段；它不进牌堆，只在对应时机于法宝栏触发。',
  },
  mid_chapter: {
    eyebrow: '途中法宝',
    title: '第一章途中再补一件',
    body: '这次选择用来补足路线方向：朱批、封势、墨或归册节奏都可以继续拉开差异。',
  },
  boss_clear: {
    eyebrow: 'Boss 后法宝',
    title: 'Boss 后留下一件余响',
    body: '这件法宝记录本章收束后的器物方向，用于后续阶段承接，不会回头扩大本章压力。',
  },
} as const

export function ArtifactOfferPage({
  offer,
  artifactDefinitionsById,
  t,
  onChoose,
}: ArtifactOfferPageProps) {
  const copy = stageCopy[offer.stage]

  return (
    <section className={`artifact-offer-page ${offer.stage}`} aria-label="法宝三选一">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">{copy.eyebrow}</p>
          <h3>{copy.title}</h3>
        </div>
        <span>{offer.options.length} 选 1</span>
      </div>
      <p className="artifact-offer-copy">{copy.body}</p>

      <div className="artifact-offer-list">
        {offer.options.map((option) => {
          const definition = artifactDefinitionsById.get(option.artifactDefinitionId)

          return (
            <button
              className="artifact-offer-card"
              disabled={!definition}
              key={option.id}
              type="button"
              onClick={() => onChoose(option.artifactDefinitionId)}
            >
              <span className="card-topline">
                <strong>{definition ? t(definition.nameKey) : option.artifactDefinitionId}</strong>
                <span>纳入法宝栏</span>
              </span>
              <span className="artifact-offer-effect">
                {definition ? t(definition.baseEffect.descriptionKey) : '缺少法宝定义'}
              </span>
              <span className="artifact-offer-condition">
                {definition ? t(definition.bindCondition.descriptionKey) : '无法读取认主条件'}
              </span>
              {definition ? (
                <span className="card-tags" aria-label="法宝标签">
                  <span>{getTriggerLabel(definition)}</span>
                  <span>未认主</span>
                  {definition.overloadCondition ? <span>有过载</span> : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function getTriggerLabel(definition: ArtifactDefinition) {
  if (definition.triggerType === 'battle_trigger') {
    return '战斗触发'
  }

  if (definition.triggerType === 'active_charge') {
    return '主动充能'
  }

  return '裁定影响'
}
