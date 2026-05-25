import { useState } from 'react'
import type {
  ArtifactDefinition,
  ArtifactState,
  CardDefinition,
  CardId,
  IncenseSealDefinition,
  IncenseSealId,
  RouteDefinition,
  RouteState,
  RunDeckCard,
  RunDeckCardId,
  TutorialRestOption,
  TutorialRestOptionId,
  TutorialRunState,
} from '../../types'
import { RunReadinessPanel } from './RunReadinessPanel'

export interface RestPageProps {
  readonly options: readonly TutorialRestOption[]
  readonly deckCards: readonly RunDeckCard[]
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>
  readonly incenseSealDefinitionsById: ReadonlyMap<IncenseSealId, IncenseSealDefinition>
  readonly route: RouteDefinition
  readonly routeState: RouteState
  readonly run: TutorialRunState
  readonly t: (key: string | undefined) => string
  readonly onChoose: (optionId: TutorialRestOptionId, deckCardId?: RunDeckCardId) => void
}

export function RestPage({
  options,
  deckCards,
  cardDefinitionsById,
  artifactDefinitionsById,
  incenseSealDefinitionsById,
  route,
  routeState,
  run,
  t,
  onChoose,
}: RestPageProps) {
  const [selectedDeckCardId, setSelectedDeckCardId] = useState(deckCards[0]?.id ?? '')
  const selectedCard = deckCards.find((card) => card.id === selectedDeckCardId)
  const visibleArtifacts = run.artifacts.artifacts

  return (
    <section className="rest-page" aria-label="休整页">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">休整</p>
          <h3>旧庙案前</h3>
        </div>
        <span>{options.length} 个选项</span>
      </div>
      <p className="rest-copy">整理牌册与朱批，查看法宝认主和反噬预警。</p>

      <div className="rest-state-row" aria-label="休整相关状态">
        <span>牌组 {deckCards.length} 张</span>
        <span>
          己形 {run.playerForm.current} / {run.playerForm.max}
        </span>
        <span>墨 {run.resources.ink}</span>
        <span>劫数 {run.resources.doom}</span>
        <span>榜裂 {run.resources.fracture}</span>
        <span>法宝 {visibleArtifacts.length} 件</span>
        <span>
          反噬预警 {visibleArtifacts.filter((artifact) => artifact.pendingBacklash).length}
        </span>
        <span>已朱批 {run.redInkRecords.filter((record) => !record.skipped).length} 次</span>
        <span>已休整 {run.rests.records.length} 次</span>
      </div>

      <RunReadinessPanel
        artifactDefinitionsById={artifactDefinitionsById}
        cardDefinitionsById={cardDefinitionsById}
        context="rest"
        incenseSealDefinitionsById={incenseSealDefinitionsById}
        route={route}
        routeState={routeState}
        run={run}
        t={t}
      />

      <div className="rest-layout">
        <div className="rest-column">
          <h4>当前牌组</h4>
          <div className="rest-deck-list">
            {deckCards.map((deckCard, index) => {
              const definition = cardDefinitionsById.get(deckCard.definitionId)
              const isSelected = deckCard.id === selectedDeckCardId

              return (
                <button
                  className={isSelected ? 'rest-deck-card selected' : 'rest-deck-card'}
                  key={`${deckCard.id}_${index}`}
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

        <div className="rest-column">
          <h4>法宝状态</h4>
          <div className="rest-artifact-list">
            {visibleArtifacts.length > 0 ? (
              visibleArtifacts.map((artifact) => {
                const definition = artifactDefinitionsById.get(artifact.definitionId)

                return definition ? (
                  <RestArtifactCard
                    artifact={artifact}
                    definition={definition}
                    key={artifact.id}
                    t={t}
                  />
                ) : null
              })
            ) : (
              <p className="empty-state">当前没有法宝。</p>
            )}
          </div>
        </div>
      </div>

      <div className="rest-options">
        {options.map((option) => {
          const isRemoveCard = option.id === 'remove_card'
          const hasEnoughInk = option.id !== 'red_ink_service' || run.resources.ink >= 1
          const canChoose = (!isRemoveCard || Boolean(selectedCard)) && hasEnoughInk
          const disabledReason = canChoose
            ? undefined
            : getRestDisabledReason(option.id, selectedCard, run)

          return (
            <button
              className={option.id === 'red_ink_service' ? 'rest-option red-ink' : 'rest-option'}
              disabled={!canChoose}
              key={option.id}
              title={disabledReason}
              type="button"
              onClick={() =>
                isRemoveCard
                  ? selectedCard && onChoose(option.id, selectedCard.id)
                  : onChoose(option.id)
              }
            >
              <span className="card-topline">
                <strong>{t(option.nameKey)}</strong>
                <span>{getRestOptionLabel(option.id, selectedCard, cardDefinitionsById, run, t)}</span>
              </span>
              <span className="rest-option-copy">{t(option.descriptionKey)}</span>
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
              {disabledReason ? <span className="card-state">{disabledReason}</span> : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function getRestDisabledReason(
  optionId: TutorialRestOptionId,
  selectedCard: RunDeckCard | undefined,
  run: TutorialRunState,
) {
  if (optionId === 'remove_card' && !selectedCard) {
    return '请先在当前牌组里选一张牌'
  }

  if (optionId === 'red_ink_service' && run.resources.ink < 1) {
    return '墨不足，需 1 墨'
  }

  return '当前不能休整'
}

function RestArtifactCard({
  artifact,
  definition,
  t,
}: {
  readonly artifact: ArtifactState
  readonly definition: ArtifactDefinition
  readonly t: (key: string | undefined) => string
}) {
  return (
    <article
      className={
        artifact.pendingBacklash
          ? 'rest-artifact-card backlash'
          : artifact.bindingStatus === 'bound'
            ? 'rest-artifact-card bound'
            : 'rest-artifact-card'
      }
    >
      <div className="artifact-card-topline">
        <strong>{t(definition.nameKey)}</strong>
        <span>{artifact.bindingStatus === 'bound' ? '认主' : '未认主'}</span>
      </div>
      <small>{t(definition.bindCondition.descriptionKey)}</small>
      <div className="artifact-progress" aria-label={`${t(definition.nameKey)}认主进度`}>
        <span style={{ width: `${getProgressPercent(artifact)}%` }} />
      </div>
      <div className="artifact-meta-row">
        <span>
          认主 {artifact.bindProgress} / {artifact.bindCondition.requiredCount}
        </span>
        <span>过载 {artifact.consecutiveOverloadBattles}</span>
      </div>
      <div className={artifact.pendingBacklash ? 'artifact-warning active' : 'artifact-warning'}>
        {artifact.pendingBacklash
          ? `反噬预警：${definition.backlashEffect ? t(definition.backlashEffect.descriptionKey) : '待结算'}`
          : definition.overloadCondition
            ? `过载条件：${t(definition.overloadCondition.descriptionKey)}`
            : '暂无过载条件'}
      </div>
    </article>
  )
}

function getRestOptionLabel(
  optionId: TutorialRestOptionId,
  selectedCard: RunDeckCard | undefined,
  cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>,
  run: TutorialRunState,
  t: (key: string | undefined) => string,
) {
  if (optionId === 'restore_form') {
    return `己形：${run.playerForm.current} / ${run.playerForm.max}`
  }

  if (optionId === 'remove_card') {
    const definition = selectedCard ? cardDefinitionsById.get(selectedCard.definitionId) : undefined

    return definition ? `目标：${t(definition.nameKey)}` : '请选择牌'
  }

  if (optionId === 'maintain_artifact') {
    const pendingBacklashCount = run.artifacts.artifacts.filter(
      (artifact) => artifact.pendingBacklash,
    ).length

    return `反噬预警 ${pendingBacklashCount}`
  }

  return '进入朱批'
}

function getProgressPercent(artifact: ArtifactState) {
  if (artifact.bindCondition.requiredCount <= 0) {
    return 100
  }

  return Math.max(
    0,
    Math.min(100, (artifact.bindProgress / artifact.bindCondition.requiredCount) * 100),
  )
}
