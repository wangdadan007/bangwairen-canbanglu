import { defineConfig, devices } from '@playwright/test'

const port = 5173
const host = '127.0.0.1'
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium-1280',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          height: 720,
          width: 1280,
        },
      },
    },
    {
      name: 'chromium-1366',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          height: 768,
          width: 1366,
        },
      },
    },
    {
      name: 'chromium-1920',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          height: 1080,
          width: 1920,
        },
      },
    },
  ],
})
