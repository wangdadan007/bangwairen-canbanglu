import { useState } from 'react'
import {
  DEFAULT_PLAYABLE_ROLE_ID,
  getPlayableRoleDefinition,
  PLAYABLE_ROLE_DEFINITIONS,
} from '../../core'
import { gameData } from '../../data'
import type { PlayableRoleDefinition, PlayableRoleId } from '../../types'

interface TitlePageProps {
  readonly hasSave: boolean
  readonly saveLabel: string
  readonly onNewGame: (roleId: PlayableRoleId) => void
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
    </header>
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
