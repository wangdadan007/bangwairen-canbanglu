import type { TutorialRunSummary } from '../../types'

export interface RunSummaryPageProps {
  readonly summary: TutorialRunSummary
  readonly onRestart: () => void
}

export function RunSummaryPage({ summary, onRestart }: RunSummaryPageProps) {
  const isComplete = summary.status === 'complete'

  return (
    <section className={isComplete ? 'run-summary-page complete' : 'run-summary-page failed'} aria-label="教学纵切结算">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">纵切结算 / T13</p>
          <h3>{isComplete ? '教学纵切完成' : '教学纵切中止'}</h3>
        </div>
        <span>
          {summary.completedEncounterCount} / {summary.totalEncounterCount} 场
        </span>
      </div>

      <p className="reward-copy">
        {isComplete
          ? '战斗、奖励、裁定和下一战流程已经串通。'
          : getFailureText(summary.failureReason)}
      </p>

      <div className="run-summary-grid" aria-label="本局记录">
        <SummaryMetric label="伏诛" value={summary.vanquishCount} />
        <SummaryMetric label="归册" value={summary.catalogueCount} />
        <SummaryMetric label="领奖" value={summary.rewardTakenCount} />
        <SummaryMetric label="跳过奖励" value={summary.rewardSkippedCount} />
        <SummaryMetric label="登簿" value={summary.verdictRegisterCount} />
        <SummaryMetric label="朱批" value={summary.redInkAppliedCount} />
        <SummaryMetric label="削籍" value={summary.verdictEraseCount} />
        <SummaryMetric label="休整" value={summary.restCount} />
        <SummaryMetric label="榜裂" value={summary.fracture} />
        <SummaryMetric label="牌组" value={summary.deckSize} />
        <SummaryMetric label="法宝" value={summary.artifactCount} />
        <SummaryMetric label="法宝认主" value={summary.boundArtifactCount} />
        <SummaryMetric label="反噬预警" value={summary.pendingArtifactBacklashCount} />
      </div>

      <div className="result-actions">
        <button type="button" onClick={onRestart}>
          重开教学纵切
        </button>
      </div>
    </section>
  )
}

function SummaryMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getFailureText(reason: TutorialRunSummary['failureReason']) {
  if (reason === 'battle_defeat') {
    return '战斗失败，本局记录已收束。'
  }

  return '本局已放弃，当前进度和成长记录已收束。'
}
