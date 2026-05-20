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

test('title, settings, and fresh run artifact offer are reachable', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '榜外人：残榜录' })).toBeVisible()

  await page.getByRole('button', { name: '设置' }).click()
  await expect(page.getByRole('region', { name: '设置' })).toBeVisible()
  await expect(page.getByLabel('设置').getByText('案前设置')).toBeVisible()
  await page.getByRole('button', { name: '返回' }).click()
  await expect(page.getByRole('region', { name: '设置' })).toBeHidden()

  await page.getByRole('button', { name: '新开本局' }).click()
  await expect(page.getByRole('region', { name: '法宝三选一' })).toBeVisible()
  await expect(page.getByText('开局法宝')).toBeVisible()
  await expect(page.getByText('待选法宝')).toBeVisible()
  await expect(page.getByText('法宝 0 件')).toBeVisible()

  await page.getByRole('button', { name: /打神鞭残节/ }).click()
  await expect(page.getByRole('region', { name: '法宝三选一' })).toBeHidden()
  await expect(page.getByText('法宝 1 件')).toBeVisible()
  await expect(page.getByRole('region', { name: '敌方目标' })).toBeVisible()
  await expect(page.getByRole('button', { name: '结束回合' })).toBeVisible()

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

  expect(horizontalOverflow).toBe(false)
  expect(errorMessages).toEqual([])
})
