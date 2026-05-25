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
          <p className="panel-kicker">事件</p>
          <h3>{t(event.nameKey)}</h3>
        </div>
        <span>{options.length} 个选项</span>
      </div>
      <p className="event-copy">{t(event.descriptionKey)}</p>

      <div className="event-state-row" aria-label="事件相关状态">
        <span>牌组 {run.deckCards.length} 张</span>
        <span>墨 {run.resources.ink}</span>
        <span>劫数 {run.resources.doom}</span>
        <span>榜裂 {run.resources.fracture}</span>
        <span>已历事件 {run.events.records.length} 次</span>
      </div>

      <div className="event-options">
        {event.options.map((option) => {
          const isAvailable = options.some((availableOption) => availableOption.id === option.id)
          const unavailableReason = isAvailable ? undefined : getUnavailableOptionReason(option, run)
          const className = [
            'event-option',
            option.flags.includes('fracture') ? 'fracture' : '',
            option.flags.includes('artifact') ? 'artifact' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              className={className}
              disabled={!isAvailable}
              key={option.id}
              title={unavailableReason}
              type="button"
              onClick={() => onChoose(option.id)}
            >
              <span className="card-topline">
                <strong>{t(option.nameKey)}</strong>
                <span>{isAvailable ? getOptionFlagLabel(option.flags) : unavailableReason}</span>
              </span>
              <span className="event-option-copy">{t(option.descriptionKey)}</span>
              {option.artifactSignalKey ? (
                <span className="event-artifact-signal">{t(option.artifactSignalKey)}</span>
              ) : null}
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
          )
        })}
      </div>
    </section>
  )
}

function getOptionFlagLabel(flags: readonly EventFlag[]) {
  if (flags.includes('artifact')) {
    return '法宝线索'
  }

  if (flags.includes('ink')) {
    return '涉及墨'
  }

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

    if (effect.type === 'ADD_INK') {
      return `墨 +${effect.amount}`
    }

    if (effect.type === 'SPEND_INK') {
      return `墨 -${effect.amount}`
    }

    if (effect.type === 'ADD_DOOM') {
      return `劫数 +${effect.amount}`
    }

    return '进入朱批'
  })
}

function getUnavailableOptionReason(option: EventOptionDefinition, run: TutorialRunState) {
  const missingStage = (option.requiredUnlockStages ?? []).find(
    (stageId) => !run.unlocks.stages.includes(stageId),
  )

  if (missingStage) {
    return '机制尚未解锁'
  }

  const spendInk = option.effects.find((effect) => effect.type === 'SPEND_INK')

  if (spendInk && run.resources.ink < spendInk.amount) {
    return `墨不足：需要 ${spendInk.amount}`
  }

  const removeCard = option.effects.find((effect) => effect.type === 'REMOVE_CARD')

  if (
    removeCard &&
    !run.deckCards.some(
      (card) => !removeCard.cardDefinitionId || card.definitionId === removeCard.cardDefinitionId,
    )
  ) {
    return '牌组里没有可删目标'
  }

  return '当前不能选择'
}
