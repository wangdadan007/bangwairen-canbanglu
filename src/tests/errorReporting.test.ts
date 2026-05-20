import { describe, expect, it } from 'vitest'
import {
  appendBrowserErrorLog,
  BROWSER_ERROR_LOG_STORAGE_KEY,
  createBrowserErrorLogEntry,
  formatBrowserErrorReport,
  readBrowserErrorLog,
  type BrowserErrorLogStorage,
} from '../ui/errorReporting'

describe('T58 browser playtest error reporting', () => {
  it('formats page, action, and error information for playtest feedback', () => {
    const entry = createBrowserErrorLogEntry({
      source: 'react_boundary',
      error: new Error('render failed'),
      createdAt: '2026-05-20T12:00:00.000Z',
      page: 'http://127.0.0.1:4173/',
      userAgent: 'Vitest Browser',
    })

    const report = formatBrowserErrorReport(entry, '点击继续游戏')

    expect(report).toContain('页面：http://127.0.0.1:4173/')
    expect(report).toContain('操作：点击继续游戏')
    expect(report).toContain('错误信息：render failed')
    expect(report).toContain('浏览器：Vitest Browser')
  })

  it('keeps the newest browser error entries and falls back safely', () => {
    const storage = createMemoryStorage()

    appendBrowserErrorLog(
      storage,
      createBrowserErrorLogEntry({
        source: 'runtime_error',
        error: 'first',
        createdAt: '2026-05-20T12:00:00.000Z',
        page: '/first',
      }),
      2,
    )
    appendBrowserErrorLog(
      storage,
      createBrowserErrorLogEntry({
        source: 'unhandled_rejection',
        error: 'second',
        createdAt: '2026-05-20T12:01:00.000Z',
        page: '/second',
      }),
      2,
    )
    appendBrowserErrorLog(
      storage,
      createBrowserErrorLogEntry({
        source: 'react_boundary',
        error: 'third',
        createdAt: '2026-05-20T12:02:00.000Z',
        page: '/third',
      }),
      2,
    )

    expect(readBrowserErrorLog(storage).map((entry) => entry.message)).toEqual(['third', 'second'])

    storage.setItem(BROWSER_ERROR_LOG_STORAGE_KEY, '{bad json')

    expect(readBrowserErrorLog(storage)).toEqual([])
  })
})

function createMemoryStorage(): BrowserErrorLogStorage {
  const values = new Map<string, string>()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}
