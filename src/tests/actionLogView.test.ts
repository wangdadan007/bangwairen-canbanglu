import { describe, expect, it } from 'vitest'
import {
  getCardEffectLabels,
  getLogEntryClassName,
  getTermTooltip,
} from '../ui/pages/actionLogView'
import { getCardDefinition } from '../data'

describe('T40 action log view helpers', () => {
  it('keeps core term tooltips aligned with project language', () => {
    expect(getTermTooltip('shape')).toContain('敌人的形体（形）')
    expect(getTermTooltip('break_form')).toContain('击破敌形（破形）')
    expect(getTermTooltip('seal_momentum')).toContain('只能降低直接来势')
    expect(getTermTooltip('abnormal_move')).toContain('需要专门处理')
  })

  it('formats card effect labels without HP, damage, or block terminology', () => {
    const nameNet = getCardDefinition('card_name_net_talisman')

    if (!nameNet) {
      throw new Error('Missing card_name_net_talisman')
    }

    const labels = getCardEffectLabels(nameNet)

    expect(labels).toEqual(['临诏'])
    expect(labels.join('')).not.toMatch(/HP|伤害|格挡/)
  })

  it('keeps pressure log classes separate for coming force and abnormal moves', () => {
    expect(
      getLogEntryClassName({
        id: 'log_1',
        sequence: 1,
        type: 'INCOMING_FORCE_SEALED',
        turn: 1,
        phase: 'player_turn',
        sourceId: 'card_guard_desk_talisman',
        payload: {},
      }),
    ).toBe('log-entry sealed')
    expect(
      getLogEntryClassName({
        id: 'log_2',
        sequence: 2,
        type: 'ABNORMAL_MOVE_EXECUTED',
        turn: 1,
        phase: 'enemy_turn',
        sourceId: 'enemy_scroll_stuffer_clerk',
        payload: {},
      }),
    ).toBe('log-entry abnormal')
  })
})
