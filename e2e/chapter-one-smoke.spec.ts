import { expect, test } from '@playwright/test'

const errorMessages: string[] = []

test.beforeEach(async ({ page }) => {
  errorMessages.length = 0

  page.on('pageerror', (error) => {
    errorMessages.push(error.message)
  })

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errorMessages.push(message.text())
    }
  })

  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
  })
  await page.reload()
})

test('title, settings, and fresh role run are reachable', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '榜外人：残榜录' })).toBeVisible()
  await expect(page.getByRole('button', { name: '衡简 己形 72' })).toBeVisible()
  await expect(page.getByRole('button', { name: '照微 己形 64' })).toBeVisible()
  await expect(page.getByRole('button', { name: '莲烬 己形 78' })).toBeVisible()

  await page.getByRole('button', { name: '设置' }).click()
  await expect(page.getByRole('region', { name: '设置' })).toBeVisible()
  await expect(page.getByLabel('设置').getByText('案前设置')).toBeVisible()
  await page.getByRole('button', { name: '返回' }).click()
  await expect(page.getByRole('region', { name: '设置' })).toBeHidden()

  await page.getByRole('button', { name: '莲烬 己形 78' }).click()
  await page.getByRole('button', { name: '以莲烬开局' }).click()
  await expect(page.getByRole('region', { name: '法宝三选一' })).toBeHidden()
  await expect(page.getByText('执簿者 莲烬', { exact: true })).toBeVisible()
  await expect(page.getByText('法宝 1 件')).toBeVisible()
  await expect(page.getByText('赤绫火轮', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: '敌方目标' })).toBeVisible()
  await expect(page.getByRole('button', { name: '结束回合' })).toBeVisible()
  await expect(page.getByLabel('战斗演出台：残榜案面').locator('canvas')).toBeVisible()

  const stageSize = await page
    .getByLabel('战斗演出台：残榜案面')
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) => {
      return {
        height: canvas.clientHeight,
        width: canvas.clientWidth,
      }
    })
  const stageScreenshot = await page.getByLabel('战斗演出台：残榜案面').screenshot()

  expect(stageSize.width).toBeGreaterThan(300)
  expect(stageSize.height).toBeGreaterThan(300)
  expect(stageScreenshot.byteLength).toBeGreaterThan(1_000)
  expect(new Set(stageScreenshot).size).toBeGreaterThan(32)

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

  expect(horizontalOverflow).toBe(false)
  expect(errorMessages).toEqual([])
})
