import type {
  CardDefinition,
  CardId,
  EventDefinition,
  EventFlag,
  EventOptionDefinition,
  TutorialRunState,
} from '../../types'

export interface EventPageProps {
  readonly event: EventDefinition
  readonly options: readonly EventOptionDefinition[]
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly run: TutorialRunState
  readonly t: (key: string | undefined) => string
  readonly onChoose: (optionId: string) => void
}

export function EventPage({
  event,
  options,
  cardDefinitionsById,
  run,
  t,
  onChoose,
}: EventPageProps) {
  return (
    <section className="event-page" aria-label="事件页">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">事件页 / T20</p>
          <h3>{t(event.nameKey)}</h3>
        </div>
        <span>{options.length} 个选项</span>
      </div>
      <p className="event-copy">{t(event.descriptionKey)}</p>

      <div className="event-state-row" aria-label="事件相关状态">
        <span>牌组 {run.deckCards.length} 张</span>
        <span>榜裂 {run.verdict.fracture}</span>
        <span>劫数未解锁</span>
        <span>已历事件 {run.events.records.length} 次</span>
      </div>

      <div className="event-options">
        {options.map((option) => (
          <button
            className={option.flags.includes('fracture') ? 'event-option fracture' : 'event-option'}
            key={option.id}
            type="button"
            onClick={() => onChoose(option.id)}
          >
            <span className="card-topline">
              <strong>{t(option.nameKey)}</strong>
              <span>{getOptionFlagLabel(option.flags)}</span>
            </span>
            <span className="event-option-copy">{t(option.descriptionKey)}</span>
            <span className="event-result-grid">
              <span>
                <em>收益</em>
                {t(option.rewardKey)}
              </span>
              <span>
                <em>代价</em>
                {t(option.costKey)}
              </span>
            </span>
            <span className="card-tags">
              {getOptionEffectLabels(option, cardDefinitionsById, t).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function getOptionFlagLabel(flags: readonly EventFlag[]) {
  if (flags.includes('fracture')) {
    return '涉及榜裂'
  }

  if (flags.includes('doom')) {
    return '涉及劫数'
  }

  if (flags.includes('red_ink')) {
    return '朱批服务'
  }

  return '无榜裂 / 劫数'
}

function getOptionEffectLabels(
  option: EventOptionDefinition,
  cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>,
  t: (key: string | undefined) => string,
) {
  return option.effects.map((effect) => {
    if (effect.type === 'ADD_CARD') {
      const card = cardDefinitionsById.get(effect.cardDefinitionId)
      return `获得：${card ? t(card.nameKey) : effect.cardDefinitionId}`
    }

    if (effect.type === 'REMOVE_CARD') {
      const card = effect.cardDefinitionId
        ? cardDefinitionsById.get(effect.cardDefinitionId)
        : undefined
      return `删牌：${card ? t(card.nameKey) : '任意一张'}`
    }

    if (effect.type === 'ADD_FRACTURE') {
      return `榜裂 +${effect.amount}`
    }

    return '进入朱批'
  })
}
