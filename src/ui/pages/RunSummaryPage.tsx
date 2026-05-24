import type { TutorialRunSummary } from '../../types'

export interface RunSummaryPageProps {
  readonly summary: TutorialRunSummary
  readonly t: (key: string | undefined) => string
  readonly onRestart: () => void
}

export function RunSummaryPage({ summary, t, onRestart }: RunSummaryPageProps) {
  const isComplete = summary.status === 'complete'

  return (
    <section className={isComplete ? 'run-summary-page complete' : 'run-summary-page failed'} aria-label="第一章结算">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">第一章结算</p>
          <h3>{isComplete ? '残榜初裂已收束' : '本局中止'}</h3>
        </div>
        <span>
          {summary.completedEncounterCount} / {summary.totalEncounterCount} 场
        </span>
      </div>

      <p className="reward-copy">
        {isComplete
          ? '残榜初裂已写完本局记录，伏诛、归册、裁定与法宝痕迹均已留档。'
          : getFailureText(summary.failureReason)}
      </p>

      <div className={summary.bossCleared ? 'boss-summary cleared' : 'boss-summary'}>
        <span>Boss 结算</span>
        <strong>{getBossSettlementText(summary)}</strong>
        {summary.registryThiefSealed ? <small>窃榜归封已写入终册</small> : null}
      </div>

      {summary.registerRuleNames.length > 0 ? (
        <div className="boss-summary cleared">
          <span>专属登簿</span>
          <strong>{summary.registerRuleNames.map((nameKey) => t(nameKey)).join(' / ')}</strong>
        </div>
      ) : null}

      {summary.heavyFractureEnding ? (
        <div className="boss-summary">
          <span>终审标记</span>
          <strong>残榜重裂</strong>
          <small>榜裂已达 5，后续终审评价会记入重裂痕。</small>
        </div>
      ) : null}

      <div className="run-summary-grid" aria-label="本局记录">
        <SummaryMetric label="伏诛" value={summary.vanquishCount} />
        <SummaryMetric label="归册" value={summary.catalogueCount} />
        <SummaryMetric label="领奖" value={summary.rewardTakenCount} />
        <SummaryMetric label="跳过奖励" value={summary.rewardSkippedCount} />
        <SummaryMetric label="登簿" value={summary.verdictRegisterCount} />
        <SummaryMetric label="朱批" value={summary.redInkAppliedCount} />
        <SummaryMetric label="削籍" value={summary.verdictEraseCount} />
        <SummaryMetric label="休整" value={summary.restCount} />
        <SummaryMetric label="商店" value={summary.shopPurchaseCount} />
        <SummaryMetric label="战后香火钱" value={summary.incenseMoneyEarned} />
        <SummaryMetric label="香封持有" value={summary.incenseSealCount} />
        <SummaryMetric label="香封消耗" value={summary.incenseSealUsedCount} />
        <SummaryMetric
          label="己形"
          value={`${summary.playerCurrentForm} / ${summary.playerMaxForm}`}
        />
        <SummaryMetric label="香火钱" value={summary.incenseMoney} />
        <SummaryMetric label="墨" value={summary.ink} />
        <SummaryMetric label="劫数" value={summary.doom} />
        <SummaryMetric label="榜裂" value={summary.fracture} />
        <SummaryMetric label="牌组" value={summary.deckSize} />
        <SummaryMetric label="法宝" value={summary.artifactCount} />
        <SummaryMetric label="法宝认主" value={summary.boundArtifactCount} />
        <SummaryMetric label="反噬预警" value={summary.pendingArtifactBacklashCount} />
      </div>

      <div className="result-actions">
        <button type="button" onClick={onRestart}>
          重开第一章
        </button>
      </div>
    </section>
  )
}

function SummaryMetric({ label, value }: { readonly label: string; readonly value: number | string }) {
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

function getBossSettlementText(summary: TutorialRunSummary) {
  if (!summary.bossCleared) {
    return '未抵达窃榜使'
  }

  return summary.bossSettlement === 'catalogue' ? '窃榜使归册' : '窃榜使伏诛'
}
