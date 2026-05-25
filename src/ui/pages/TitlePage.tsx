import { useState } from 'react'
import {
  DEFAULT_PLAYABLE_ROLE_ID,
  getPlayableRoleDefinition,
  PLAYABLE_ROLE_DEFINITIONS,
} from '../../core'
import { gameData } from '../../data'
import type { CodexRecordEntry, CodexRecordState, PlayableRoleDefinition, PlayableRoleId } from '../../types'

interface TitlePageProps {
  readonly codexRecordState?: CodexRecordState
  readonly hasSave: boolean
  readonly saveLabel: string
  readonly onNewGame: (roleId: PlayableRoleId) => void
  readonly onContinue: () => void
  readonly onOpenSettings: () => void
}

export function TitlePage({
  codexRecordState,
  hasSave,
  saveLabel,
  onNewGame,
  onContinue,
  onOpenSettings,
}: TitlePageProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<PlayableRoleId>(DEFAULT_PLAYABLE_ROLE_ID)
  const selectedRole = getPlayableRoleDefinition(selectedRoleId)

  return (
    <header className="title-page">
      <p className="eyebrow">第一章公开 Demo 候选版</p>
      <h1>榜外人：残榜录</h1>
      <p>残榜名路已接入完整第一章路线、三名原创执簿者、固定起始法宝、设置、本地继续和候选版收口记录。</p>
      <div className="role-select" aria-label="选择执簿者">
        {PLAYABLE_ROLE_DEFINITIONS.map((role) => (
          <RoleSelectCard
            isSelected={role.id === selectedRoleId}
            key={role.id}
            role={role}
            onSelect={() => setSelectedRoleId(role.id)}
          />
        ))}
      </div>
      <div className="title-actions" aria-label="标题页操作">
        <button type="button" onClick={() => onNewGame(selectedRole.id)}>
          以{t(selectedRole.nameKey)}开局
        </button>
        <button className="ghost-button" disabled={!hasSave} type="button" onClick={onContinue}>
          继续游戏
        </button>
        <button className="ghost-button" type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>
      <p className="save-status">{saveLabel}</p>
      <CodexPreview codexRecordState={codexRecordState} />
    </header>
  )
}

function CodexPreview({
  codexRecordState,
}: {
  readonly codexRecordState?: CodexRecordState
}) {
  const entries = codexRecordState?.entries ?? []
  const latestEntries = entries.slice(-4).reverse()

  return (
    <section className="title-codex-preview" aria-label="残榜图鉴">
      <span>残榜图鉴</span>
      <strong>{entries.length} 条留痕</strong>
      {latestEntries.length > 0 ? (
        <div>
          {latestEntries.map((entry) => (
            <small key={entry.id}>
              {getCodexKindLabel(entry.kind)}：{entry.nameKey ? t(entry.nameKey) : entry.subjectId}
            </small>
          ))}
        </div>
      ) : (
        <small>尚无历史 run 终册记录。</small>
      )}
    </section>
  )
}

function RoleSelectCard({
  role,
  isSelected,
  onSelect,
}: {
  readonly role: PlayableRoleDefinition
  readonly isSelected: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`role-card ${isSelected ? 'selected' : ''}`}
      type="button"
      onClick={onSelect}
    >
      <span className="role-card-topline">
        <strong>{t(role.nameKey)}</strong>
        <small>己形 {role.playerMaxForm}</small>
      </span>
      <span>{t(role.titleKey)}</span>
      <em>{t(role.archetypeKey)}</em>
      <small>{t(role.descriptionKey)}</small>
      <span className="role-feature">{t(role.featureKey)}</span>
    </button>
  )
}

function t(key: string) {
  return gameData.localization[key] ?? key
}

function getCodexKindLabel(kind: CodexRecordEntry['kind']) {
  const labels: Record<CodexRecordEntry['kind'], string> = {
    enemy_vanquished: '伏诛',
    enemy_catalogued: '归册',
    boss_vanquished: 'Boss 伏诛',
    boss_sealed: '窃榜归封',
    artifact_claimed: '法宝',
    artifact_bound: '认主',
    verdict_register: '登簿',
    verdict_red_ink: '朱批',
    verdict_erase: '削籍',
    route_ending: '结局',
  }

  return labels[kind]
}
