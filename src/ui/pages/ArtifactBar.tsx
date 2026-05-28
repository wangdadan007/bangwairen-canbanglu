import type {
  ArtifactCollectionState,
  ArtifactDefinition,
  ArtifactState,
} from '../../types'

export interface ArtifactBarProps {
  readonly artifacts: ArtifactCollectionState
  readonly artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>
  readonly t: (key: string) => string
}

export function ArtifactBar({ artifacts, artifactDefinitionsById, t }: ArtifactBarProps) {
  const visibleArtifacts = artifacts.artifacts

  return (
    <section className="artifact-bar" aria-label="法宝栏">
      <header>
        <div>
          <p className="panel-kicker">法宝栏</p>
          <h3>牌组外器物</h3>
        </div>
        <span>{visibleArtifacts.length} 件</span>
      </header>

      <div className="artifact-grid">
        {visibleArtifacts.length > 0 ? (
          visibleArtifacts.map((artifact) => {
            const definition = artifactDefinitionsById.get(artifact.definitionId)

            return definition ? (
              <ArtifactCard
                artifact={artifact}
                definition={definition}
                key={artifact.id}
                t={t}
              />
            ) : (
              <div className="artifact-card missing" key={artifact.id}>
                <strong>{artifact.definitionId}</strong>
                <small>缺少法宝定义</small>
              </div>
            )
          })
        ) : (
          <p className="empty-state">当前没有法宝。法宝本体不会进入抽牌堆。</p>
        )}
      </div>
    </section>
  )
}

function ArtifactCard({
  artifact,
  definition,
  t,
}: {
  readonly artifact: ArtifactState
  readonly definition: ArtifactDefinition
  readonly t: (key: string) => string
}) {
  const progressLabel = `${artifact.bindProgress} / ${artifact.bindCondition.requiredCount}`
  const effect = artifact.bindingStatus === 'bound' ? definition.boundEffect : definition.baseEffect
  const statusLabel =
    artifact.bindingStatus === 'bound'
      ? '已认主'
      : `认主 ${artifact.bindProgress}/${artifact.bindCondition.requiredCount}`

  return (
    <article
      className={
        artifact.pendingBacklash
          ? 'artifact-card backlash'
          : artifact.bindingStatus === 'bound'
            ? 'artifact-card bound'
            : 'artifact-card'
      }
    >
      <div className="artifact-card-topline">
        <strong>{t(definition.nameKey)}</strong>
        <span>{statusLabel}</span>
      </div>
      <p>{t(effect.descriptionKey)}</p>
      <small>{t(definition.bindCondition.descriptionKey)}</small>
      <div className="artifact-progress" aria-label={`${t(definition.nameKey)}认主进度`}>
        <span style={{ width: `${getProgressPercent(artifact)}%` }} />
      </div>
      <div className="artifact-meta-row">
        <span>认主 {progressLabel}</span>
        <span>充能 {artifact.chargesRemaining}</span>
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

function getProgressPercent(artifact: ArtifactState) {
  if (artifact.bindCondition.requiredCount <= 0) {
    return 100
  }

  return Math.max(
    0,
    Math.min(100, (artifact.bindProgress / artifact.bindCondition.requiredCount) * 100),
  )
}
