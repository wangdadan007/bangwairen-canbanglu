export const BROWSER_ERROR_LOG_STORAGE_KEY = 'bangwairen.playtest.errorLog.v1'
const DEFAULT_ERROR_LOG_LIMIT = 8

export type BrowserErrorSource = 'runtime_error' | 'unhandled_rejection' | 'react_boundary'

export interface BrowserErrorLogEntry {
  readonly id: string
  readonly createdAt: string
  readonly source: BrowserErrorSource
  readonly page: string
  readonly message: string
  readonly stack?: string
  readonly detail?: string
  readonly userAgent?: string
}

export interface BrowserErrorLogStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface CreateBrowserErrorLogEntryInput {
  readonly source: BrowserErrorSource
  readonly error: unknown
  readonly detail?: string
  readonly createdAt?: string
  readonly page?: string
  readonly userAgent?: string
}

export function createBrowserErrorLogEntry({
  source,
  error,
  detail,
  createdAt = new Date().toISOString(),
  page = getCurrentPage(),
  userAgent = getCurrentUserAgent(),
}: CreateBrowserErrorLogEntryInput): BrowserErrorLogEntry {
  const normalized = normalizeError(error)

  return {
    id: `${createdAt}_${source}`,
    createdAt,
    source,
    page,
    message: normalized.message,
    stack: normalized.stack,
    detail,
    userAgent,
  }
}

export function appendBrowserErrorLog(
  storage: BrowserErrorLogStorage,
  entry: BrowserErrorLogEntry,
  limit = DEFAULT_ERROR_LOG_LIMIT,
) {
  const entries = [entry, ...readBrowserErrorLog(storage)].slice(0, limit)

  try {
    storage.setItem(BROWSER_ERROR_LOG_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    return false
  }

  return true
}

export function readBrowserErrorLog(storage: BrowserErrorLogStorage): readonly BrowserErrorLogEntry[] {
  let rawValue: string | null

  try {
    rawValue = storage.getItem(BROWSER_ERROR_LOG_STORAGE_KEY)
  } catch {
    return []
  }

  if (!rawValue) {
    return []
  }

  try {
    const value = JSON.parse(rawValue) as unknown

    return Array.isArray(value) ? value.map(normalizeLogEntry).filter(isBrowserErrorLogEntry) : []
  } catch {
    return []
  }
}

export function formatBrowserErrorReport(
  entry: BrowserErrorLogEntry,
  action = '请填写刚才点了什么或正在做什么',
) {
  const lines = [
    `页面：${entry.page}`,
    `操作：${action}`,
    `时间：${entry.createdAt}`,
    `错误来源：${entry.source}`,
    `错误信息：${entry.message}`,
  ]

  if (entry.detail) {
    lines.push(`补充信息：${entry.detail}`)
  }

  if (entry.stack) {
    lines.push(`堆栈：${entry.stack}`)
  }

  if (entry.userAgent) {
    lines.push(`浏览器：${entry.userAgent}`)
  }

  return lines.join('\n')
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      stack: error.stack,
    }
  }

  if (typeof error === 'string') {
    return {
      message: error,
    }
  }

  return {
    message: safeStringify(error),
  }
}

function normalizeLogEntry(value: unknown): BrowserErrorLogEntry | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const source = value.source

  if (!isBrowserErrorSource(source)) {
    return undefined
  }

  return {
    id: getString(value.id) ?? `${getString(value.createdAt) ?? 'unknown'}_${source}`,
    createdAt: getString(value.createdAt) ?? 'unknown',
    source,
    page: getString(value.page) ?? 'unknown',
    message: getString(value.message) ?? 'unknown error',
    stack: getString(value.stack),
    detail: getString(value.detail),
    userAgent: getString(value.userAgent),
  }
}

function isBrowserErrorLogEntry(value: BrowserErrorLogEntry | undefined): value is BrowserErrorLogEntry {
  return Boolean(value)
}

function isBrowserErrorSource(value: unknown): value is BrowserErrorSource {
  return value === 'runtime_error' || value === 'unhandled_rejection' || value === 'react_boundary'
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function getCurrentPage() {
  if (typeof window === 'undefined') {
    return 'unknown'
  }

  return window.location.href
}

function getCurrentUserAgent() {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  return navigator.userAgent
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
