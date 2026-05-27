import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import zhCN from '../data/localization/zh-CN.json'
import { VerdictPage } from '../ui/pages/VerdictPage'
import type {
  TutorialResourceState,
  TutorialVerdictOffer,
  TutorialVerdictOption,
  TutorialVerdictState,
} from '../types'

describe('VerdictPage', () => {
  it('shows the current T93 erase payoff wording', () => {
    const gainInkHtml = renderVerdictOption({
      id: 'erase_gain_ink',
      choiceId: 'erase',
      eraseVariantId: 'erase_gain_ink',
      nameKey: 'verdict.erase.gain_ink.name',
      rulesTextKey: 'verdict.erase.gain_ink.rules',
    })
    const nextBattleHtml = renderVerdictOption({
      id: 'erase_next_battle_resources',
      choiceId: 'erase',
      eraseVariantId: 'erase_next_battle_resources',
      nameKey: 'verdict.erase.next_battle_resources.name',
      rulesTextKey: 'verdict.erase.next_battle_resources.rules',
    })

    expect(gainInkHtml).toContain('下一次休整 / 事件朱批墨消耗 -1')
    expect(nextBattleHtml).toContain('首回合香火 +1')
    expect(nextBattleHtml).not.toContain('首回合香火 +2')
  })
})

function renderVerdictOption(option: TutorialVerdictOption) {
  return renderToStaticMarkup(
    createElement(VerdictPage, {
      offer: createOffer(option),
      resources: createResources(),
      verdict: createVerdict(),
      t,
      onChoose: () => undefined,
    }),
  )
}

function createOffer(option: TutorialVerdictOption): TutorialVerdictOffer {
  return {
    id: `offer_${option.id}`,
    encounterId: 'encounter_tutorial_paper_wraith',
    enemyDefinitionId: 'enemy_paper_wraith',
    enemyNameKey: 'enemy.paper_wraith.name',
    revealedNameKeys: ['enemy.paper_wraith.name_slot.0'],
    options: [option],
  }
}

function createResources(): TutorialResourceState {
  return {
    ink: 0,
    doom: 0,
    fracture: 0,
  }
}

function createVerdict(): TutorialVerdictState {
  return {
    maxIncenseBonus: 0,
    registerEntries: [],
    records: [],
  }
}

function t(key: string | undefined) {
  return key ? zhCN[key as keyof typeof zhCN] ?? key : ''
}
