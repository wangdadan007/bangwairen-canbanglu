import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE_URL = process.env.BANGWAIREN_BASE_URL ?? 'http://127.0.0.1:5173/'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(
  __dirname,
  '../docs/qa/screenshots/t94-presentation-phase-two',
)

const VIEWPORTS = [
  { label: '1280x720', width: 1280, height: 720 },
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1920x1080', width: 1920, height: 1080 },
]

const screenshotRecords = []

await fs.mkdir(OUTPUT_DIR, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
    })
    const page = await context.newPage()
    const messages = []

    page.on('pageerror', (error) => {
      messages.push(`pageerror: ${error.message}`)
    })
    page.on('console', (message) => {
      if (message.type() === 'error') {
        messages.push(`console: ${message.text()}`)
      }
    })

    await captureBattlePresentationFlow(page, viewport.label)
    await captureVerdictProbe(page, viewport.label)

    await context.close()

    if (messages.length > 0) {
      throw new Error(
        `Browser errors in ${viewport.label}:\n${messages.join('\n')}`,
      )
    }
  }

  screenshotRecords.sort((left, right) =>
    `${left.viewport}-${left.label}`.localeCompare(`${right.viewport}-${right.label}`),
  )

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    `${JSON.stringify(
      {
        baseURL: BASE_URL,
        capturedAt: new Date().toISOString(),
        screenshots: screenshotRecords,
      },
      null,
      2,
    )}\n`,
  )

  console.log(`CAPTURED ${screenshotRecords.length} screenshots`)
  for (const record of screenshotRecords) {
    console.log(`${record.viewport} ${record.label}: ${record.path}`)
  }
} finally {
  await browser.close()
}

async function captureBattlePresentationFlow(page, viewportLabel) {
  await resetPage(page)
  await capture(page, viewportLabel, '01-title')

  await startRoleRun(page, /莲烬\s+己形 78/, '以莲烬开局')
  await capture(page, viewportLabel, '02-first-battle-lianjin', {
    focus: page.getByRole('region', { name: '第一章试玩区域' }),
  })

  await completeCurrentBattle(page)
  await resolvePendingChoices(page)
  await page.getByRole('region', { name: '敌方目标' }).waitFor()
  await capture(page, viewportLabel, '03-second-battle-action-readability', {
    focus: page.getByRole('region', { name: '第一章试玩区域' }),
  })

  for (let battleIndex = 0; battleIndex < 2; battleIndex += 1) {
    await completeCurrentBattle(page)
    await resolvePendingChoices(page)
  }

  await page.getByRole('region', { name: '路线与节点' }).waitFor()
  await capture(page, viewportLabel, '04-route-branching-after-tutorial', {
    focus: page.getByRole('region', { name: '路线与节点' }),
  })

  await chooseRouteNode(page, '无灯庙祝')
  await completeCurrentBattle(page)
  await resolvePendingChoices(page)
  await continueUntilBossBattle(page)
  if (await isVisible(page.getByRole('region', { name: '敌方目标' }))) {
    await capture(page, viewportLabel, '05-boss-battle-opening', {
      focus: page.getByRole('region', { name: '第一章试玩区域' }),
    })
  }
}

async function captureVerdictProbe(page, viewportLabel) {
  await resetPage(page)
  await startRoleRun(page, /衡简\s+己形 72/, '以衡简开局')

  const resultAction = await completeCurrentBattle(page, { preferAskName: true })
  if (resultAction === '进入裁定' && (await isVisible(page.locator('.verdict-page')))) {
    await capture(page, viewportLabel, '06-verdict-page', {
      focus: page.locator('.verdict-page'),
      note: 'catalogue verdict page reached with ask-name priority',
    })
    return
  }

  await capture(page, viewportLabel, '06-verdict-probe-fallback', {
    note: `verdict page not reached; result action was ${resultAction ?? 'none'}`,
  })
}

async function resetPage(page) {
  await page.goto(BASE_URL)
  await page.evaluate(() => {
    window.localStorage.clear()
  })
  await page.reload()
  await page.getByRole('heading', { name: '榜外人：残榜录' }).waitFor()
}

async function startRoleRun(page, roleName, startButtonName) {
  await page.getByRole('button', { name: roleName }).click()
  await page.getByRole('button', { name: startButtonName }).click()
  await page.getByRole('region', { name: '敌方目标' }).waitFor()
}

async function capture(page, viewportLabel, label, options = {}) {
  const filename = `${viewportLabel}-${label}.png`
  const absolutePath = path.join(OUTPUT_DIR, filename)
  if (options.focus) {
    await options.focus.evaluate((element) => {
      element.scrollIntoView({ block: 'start', inline: 'nearest' })
    })
    await page.waitForTimeout(100)
  }
  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const canvasInfo = {
      present: Boolean(canvas),
      width: canvas?.clientWidth ?? 0,
      height: canvas?.clientHeight ?? 0,
      centerPixelNonBlank: null,
    }

    if (canvas) {
      try {
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
        if (gl) {
          const pixels = new Uint8Array(4)
          gl.readPixels(
            Math.floor(gl.drawingBufferWidth / 2),
            Math.floor(gl.drawingBufferHeight / 2),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          )
          canvasInfo.centerPixelNonBlank = Array.from(pixels).some((value) => value !== 0)
        }
      } catch {
        canvasInfo.centerPixelNonBlank = null
      }
    }

    return {
      canvas: canvasInfo,
      enemyVisualCuesVisible: Boolean(document.querySelector('.enemy-visual-cues')),
      handListVisible: Boolean(document.querySelector('.hand-list')),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      intentBannerVisible: Boolean(document.querySelector('.intent-banner')),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollY: Math.round(window.scrollY),
      verdictPageVisible: Boolean(document.querySelector('.verdict-page')),
    }
  })
  await page.screenshot({ path: absolutePath, fullPage: false })
  screenshotRecords.push({
    label,
    metrics,
    note: options.note,
    viewport: viewportLabel,
    path: absolutePath,
  })
}

async function completeCurrentBattle(page, options = {}) {
  for (let step = 0; step < 120; step += 1) {
    const resultAction = await clickResultActionIfVisible(page)
    if (resultAction) {
      return resultAction
    }

    if (await isVisible(page.getByRole('button', { name: '查看结算' }))) {
      throw new Error('Run failed before screenshot flow reached its target')
    }

    await selectFirstAvailableEnemyIfNeeded(page)

    const enabledCards = page.locator('.hand-list button:not([disabled])')
    const count = await enabledCards.count()

    if (count > 0) {
      const index = await chooseCardIndex(enabledCards, count, options)
      await enabledCards.nth(index).click()
      await page.waitForTimeout(80)
      continue
    }

    const endTurn = page.getByRole('button', { name: '结束回合' })
    if (await isVisible(endTurn)) {
      await endTurn.click()
      await page.waitForTimeout(120)
      continue
    }

    await page.waitForTimeout(120)
  }

  throw new Error('Timed out while completing battle')
}

async function clickResultActionIfVisible(page) {
  const resultButtons = [
    '进入裁定',
    '查看战后奖励',
    '查看收束奖励',
  ]

  for (const buttonName of resultButtons) {
    const button = page.getByRole('button', { name: buttonName })
    if (await isVisible(button)) {
      await button.click()
      await page.waitForTimeout(120)
      return buttonName
    }
  }

  return undefined
}

async function resolvePendingChoices(page) {
  for (let step = 0; step < 30; step += 1) {
    if (await isVisible(page.locator('.verdict-page'))) {
      await page.locator('.verdict-option').first().click()
      await page.waitForTimeout(120)
      continue
    }

    if (await isVisible(page.locator('.red-ink-page'))) {
      await page.getByRole('button', { name: '暂不朱批' }).click()
      await page.waitForTimeout(120)
      continue
    }

    if (await isVisible(page.locator('.artifact-offer-page'))) {
      await page.locator('.artifact-offer-card:not([disabled])').first().click()
      await page.waitForTimeout(120)
      continue
    }

    if (await isVisible(page.locator('.reward-page'))) {
      const rewardCard = page.locator('.reward-card').first()
      if (await isVisible(rewardCard)) {
        await rewardCard.click()
      } else if (await isVisible(page.getByRole('button', { name: '跳过奖励' }))) {
        await page.getByRole('button', { name: '跳过奖励' }).click()
      } else if (await isVisible(page.getByRole('button', { name: '跳过香封' }))) {
        await page.getByRole('button', { name: '跳过香封' }).click()
      }
      await page.waitForTimeout(120)
      continue
    }

    return
  }

  throw new Error('Timed out while resolving pending choices')
}

async function chooseRouteNode(page, text) {
  const routeItem = page.locator('li', { hasText: text }).filter({
    has: page.getByRole('button', { name: '择此路' }),
  })
  await routeItem.first().getByRole('button', { name: '择此路' }).click()
  await page.waitForTimeout(120)
}

async function continueUntilBossBattle(page) {
  for (let step = 0; step < 120; step += 1) {
    if (await isVisible(page.getByText('Boss：窃榜使'))) {
      if (await isVisible(page.getByRole('region', { name: '敌方目标' }))) {
        return
      }

      const bossRouteItem = page.locator('li', { hasText: 'Boss：窃榜使' }).filter({
        has: page.getByRole('button', { name: '择此路' }),
      })
      if (await isVisible(bossRouteItem.first())) {
        await bossRouteItem.first().getByRole('button', { name: '择此路' }).click()
        await page.getByRole('region', { name: '敌方目标' }).waitFor()
        return
      }
    }

    if (await isVisible(page.getByRole('region', { name: '敌方目标' }))) {
      await completeCurrentBattle(page)
      await resolvePendingChoices(page)
      continue
    }

    if (await isVisible(page.getByRole('region', { name: '休整页' }))) {
      const restore = page.locator('.rest-option').filter({ hasText: '修补己形' }).first()
      if (await isVisible(restore)) {
        await restore.click()
      } else {
        await page.locator('.rest-option:not([disabled])').first().click()
      }
      await page.waitForTimeout(120)
      continue
    }

    if (await isVisible(page.getByRole('region', { name: '商店页' }))) {
      await page.getByRole('button', { name: '离开商店' }).click()
      await page.waitForTimeout(120)
      continue
    }

    if (await isVisible(page.getByRole('region', { name: '路线与节点' }))) {
      const firstChoice = page.getByRole('button', { name: '择此路' }).first()
      if (await isVisible(firstChoice)) {
        await firstChoice.click()
        await page.waitForTimeout(120)
        continue
      }
    }

    if (await isVisible(page.getByRole('button', { name: '继续前行' }))) {
      await page.getByRole('button', { name: '继续前行' }).click()
      await page.waitForTimeout(120)
      continue
    }

    await page.waitForTimeout(120)
  }

  throw new Error('Timed out before reaching boss battle')
}

async function selectFirstAvailableEnemyIfNeeded(page) {
  const currentTargetCount = await page.getByRole('button', { name: '当前目标' }).count()
  if (currentTargetCount > 0) {
    return
  }

  const targetButton = page.getByRole('button', { name: '设为目标' }).first()
  if (await isVisible(targetButton)) {
    await targetButton.click()
    await page.waitForTimeout(80)
  }
}

async function chooseCardIndex(cards, count, options) {
  const priorityPatterns = options.preferAskName
    ? [/问名|点额/, /正名/, /破形/, /火|雷|鞭|击/, /封势|断异动/]
    : [/破形/, /火|雷|鞭|击/, /问名|点额/, /封势|断异动/]

  for (const pattern of priorityPatterns) {
    for (let index = 0; index < count; index += 1) {
      const text = await cards.nth(index).innerText()
      if (pattern.test(text)) {
        return index
      }
    }
  }

  return 0
}

async function isVisible(locator) {
  try {
    return await locator.isVisible({ timeout: 250 })
  } catch {
    return false
  }
}
