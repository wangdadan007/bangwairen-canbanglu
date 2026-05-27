import type {
  TutorialResourceState,
  TutorialVerdictOffer,
  TutorialVerdictOption,
  TutorialVerdictOptionId,
  TutorialVerdictState,
} from '../../types'
import { normalizeTutorialVerdictOffer } from '../../core'
import { useEffect, useState } from 'react'

export interface VerdictPageProps {
  readonly offer: TutorialVerdictOffer
  readonly resources: TutorialResourceState
  readonly verdict: TutorialVerdictState
  readonly t: (key: string | undefined) => string
  readonly onChoose: (choiceId: TutorialVerdictOptionId) => void
}

export function VerdictPage({ offer, resources, verdict, t, onChoose }: VerdictPageProps) {
  const [isEraseOpen, setIsEraseOpen] = useState(false)
  const visibleOffer = normalizeTutorialVerdictOffer(offer) ?? offer
  const eraseOptions = visibleOffer.options.filter((option) => option.choiceId === 'erase')
  const baseEraseOptions = eraseOptions.filter((option) => !option.sourceType)
  const enhancedEraseOptions = eraseOptions.filter((option) => option.sourceType)
  const directOptions = visibleOffer.options.filter((option) => option.choiceId !== 'erase')
  const shouldGroupErase = eraseOptions.length > 1
  const primaryOptionCount = directOptions.length + (shouldGroupErase ? 1 : eraseOptions.length)

  useEffect(() => {
    setIsEraseOpen(false)
  }, [offer.id])

  return (
    <section className="verdict-page t100-verdict-feedback" aria-label="裁定页">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">裁定</p>
          <h3>归册后的裁定</h3>
        </div>
        <span>{primaryOptionCount} 类裁定</span>
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
        {directOptions.map((option) => (
          <button
            className={`verdict-option ${option.choiceId} ${option.id}`}
            key={option.id}
            type="button"
            onClick={() => onChoose(option.id)}
          >
            <strong>{t(option.nameKey)}</strong>
            <span>{t(option.rulesTextKey)}</span>
            <small>{getVerdictImpact(option, visibleOffer, resources, t)}</small>
          </button>
        ))}
        {shouldGroupErase ? (
          <div className="verdict-erase-group">
            <button
              aria-expanded={isEraseOpen}
              className="verdict-option erase verdict-option-group"
              type="button"
              onClick={() => setIsEraseOpen((current) => !current)}
            >
              <strong>削籍</strong>
              <span>抹去名籍换取强收益，并推高榜裂风险。</span>
              <small>{isEraseOpen ? '收起判词' : `${eraseOptions.length} 个判词可展开比较`}</small>
            </button>
            {isEraseOpen ? (
              <div className="verdict-erase-options" aria-label="削籍判词">
                {baseEraseOptions.length ? (
                  <div className="verdict-erase-section-label">基础判词</div>
                ) : null}
                {baseEraseOptions.map((option) => (
                  <EraseOptionButton
                    key={option.id}
                    offer={visibleOffer}
                    option={option}
                    resources={resources}
                    t={t}
                    onChoose={onChoose}
                  />
                ))}
                {enhancedEraseOptions.length ? (
                  <div className="verdict-erase-section-label">法宝强化</div>
                ) : null}
                {enhancedEraseOptions.map((option) => (
                  <EraseOptionButton
                    key={`${option.id}:${option.sourceId ?? 'source'}`}
                    offer={visibleOffer}
                    option={option}
                    resources={resources}
                    t={t}
                    onChoose={onChoose}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          eraseOptions.map((option) => (
            <button
              className={`verdict-option ${option.choiceId} ${option.id}`}
              key={option.id}
              type="button"
              onClick={() => onChoose(option.id)}
            >
              <strong>{t(option.nameKey)}</strong>
              <span>{t(option.rulesTextKey)}</span>
              <small>{getVerdictImpact(option, visibleOffer, resources, t)}</small>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function EraseOptionButton({
  offer,
  option,
  resources,
  t,
  onChoose,
}: {
  readonly offer: TutorialVerdictOffer
  readonly option: TutorialVerdictOption
  readonly resources: TutorialResourceState
  readonly t: VerdictPageProps['t']
  readonly onChoose: VerdictPageProps['onChoose']
}) {
  return (
    <button
      className={`verdict-option erase ${option.id} verdict-erase-choice`}
      type="button"
      onClick={() => onChoose(option.id)}
    >
      <strong>{t(option.nameKey)}</strong>
      <span>{t(option.rulesTextKey)}</span>
      <small>{getVerdictImpact(option, offer, resources, t)}</small>
    </button>
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

function getVerdictImpact(
  option: TutorialVerdictOption,
  offer: TutorialVerdictOffer,
  resources: TutorialResourceState,
  t: VerdictPageProps['t'],
) {
  if (option.choiceId === 'register') {
    return getRegisterImpact(offer, t)
  }

  if (option.choiceId === 'red_ink') {
    return '进入朱批页，批改一张已有牌'
  }

  if (option.id === 'erase_gain_ink') {
    return '削籍判词：榜裂 +1，墨 +2；下一次休整 / 事件朱批墨消耗 -1'
  }

  if (option.id === 'erase_heavy_split_form') {
    const sourceLabel = option.sourceNameKey ? `法宝强化：${t(option.sourceNameKey)}。` : '法宝强化。'
    return `${sourceLabel}榜裂 +1，劫数 +1，加入重裂形符；下一战开局上手${getDoomRiskHint(
      resources.doom,
    )}`
  }

  if (option.id === 'erase_next_battle_resources') {
    return '削籍判词：榜裂 +1，下一场开局墨 +1、首回合香火 +1'
  }

  return '削籍判词：榜裂 +1，加入裂形符；下一战开局上手'
}

function getDoomRiskHint(currentDoom: number) {
  const nextDoom = currentDoom + 1

  if (nextDoom >= 4) {
    return '；劫数将进入高压阈值'
  }

  if (nextDoom >= 3) {
    return '；劫数接近高压阈值'
  }

  return ''
}

function getRegisterImpact(offer: TutorialVerdictOffer, t: VerdictPageProps['t']) {
  const specialRule = getSpecialRegisterRule(offer.enemyDefinitionId)

  return specialRule
    ? `专属登簿：${t(specialRule.nameKey)}`
    : '通用登簿：本幕段最多 3 次，每场首次正名墨 +1'
}

function getSpecialRegisterRule(enemyDefinitionId: string) {
  const rules: Readonly<Record<string, { readonly nameKey: string }>> = {
    enemy_incense_clerk: {
      nameKey: 'verdict.register.rule.incense_clerk.name',
    },
    enemy_fire_fleeing_name: {
      nameKey: 'verdict.register.rule.fire_fleeing_name.name',
    },
    enemy_dipper_empty_shell: {
      nameKey: 'verdict.register.rule.dipper_empty_shell.name',
    },
    enemy_registry_thief: {
      nameKey: 'verdict.register.rule.registry_thief.name',
    },
  }

  return rules[enemyDefinitionId]
}
