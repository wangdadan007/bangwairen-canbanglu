interface TitlePageProps {
  readonly hasSave: boolean
  readonly saveLabel: string
  readonly onNewGame: () => void
  readonly onContinue: () => void
  readonly onOpenSettings: () => void
}

export function TitlePage({
  hasSave,
  saveLabel,
  onNewGame,
  onContinue,
  onOpenSettings,
}: TitlePageProps) {
  return (
    <header className="title-page">
      <p className="eyebrow">第一章公开 Demo 候选版</p>
      <h1>榜外人：残榜录</h1>
      <p>残榜名路已接入完整第一章路线、法宝认主、反噬预警、设置、本地继续和候选版收口记录。</p>
      <div className="title-actions" aria-label="标题页操作">
        <button type="button" onClick={onNewGame}>
          新开本局
        </button>
        <button className="ghost-button" disabled={!hasSave} type="button" onClick={onContinue}>
          继续游戏
        </button>
        <button className="ghost-button" type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>
      <p className="save-status">{saveLabel}</p>
    </header>
  )
}
