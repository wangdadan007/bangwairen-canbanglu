import type {
  TutorialResourceState,
  TutorialVerdictChoiceId,
  TutorialVerdictOffer,
  TutorialVerdictState,
} from '../../types'

export interface VerdictPageProps {
  readonly offer: TutorialVerdictOffer
  readonly resources: TutorialResourceState
  readonly verdict: TutorialVerdictState
  readonly t: (key: string | undefined) => string
  readonly onChoose: (choiceId: TutorialVerdictChoiceId) => void
}

export function VerdictPage({ offer, resources, verdict, t, onChoose }: VerdictPageProps) {
  return (
    <section className="verdict-page" aria-label="裁定页">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">裁定</p>
          <h3>归册后的裁定</h3>
        </div>
        <span>{offer.options.length} 选 1</span>
      </div>

      <div className="verdict-target">
        <span>归册对象</span>
        <strong>{t(offer.enemyNameKey)}</strong>
        <small>{formatRevealedNames(offer, t)}</small>
      </div>

      <div className="verdict-state-row" aria-label="裁定状态">
        <span>墨 {resources.ink}</span>
        <span>劫数 {resources.doom}</span>
        <span>榜裂 {resources.fracture}</span>
        <span>登簿 {verdict.registerEntries.length}</span>
        <span>裁定 {verdict.records.length} 次</span>
      </div>

      <div className="verdict-options">
        {offer.options.map((option) => (
          <button
            className={`verdict-option ${option.id}`}
            key={option.id}
            type="button"
            onClick={() => onChoose(option.id)}
          >
            <strong>{t(option.nameKey)}</strong>
            <span>{t(option.rulesTextKey)}</span>
            <small>{getVerdictImpact(option.id)}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

function formatRevealedNames(
  offer: TutorialVerdictOffer,
  t: VerdictPageProps['t'],
) {
  return offer.revealedNameKeys.length > 0
    ? offer.revealedNameKeys.map((nameKey) => t(nameKey)).join(' / ')
    : '无可记录名格'
}

function getVerdictImpact(choiceId: TutorialVerdictChoiceId) {
  if (choiceId === 'register') {
    return '后续战斗香火上限 +1，己形上限 +4'
  }

  if (choiceId === 'red_ink') {
    return '进入朱批页，批改一张已有牌'
  }

  return '榜裂 +1，并加入裂形符'
}
