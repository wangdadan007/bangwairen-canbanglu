import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { BrowserErrorLogEntry, BrowserErrorLogStorage } from './errorReporting'
import {
  appendBrowserErrorLog,
  createBrowserErrorLogEntry,
  formatBrowserErrorReport,
} from './errorReporting'

interface AppErrorBoundaryProps {
  readonly children: ReactNode
  readonly storage?: BrowserErrorLogStorage
}

interface AppErrorBoundaryState {
  readonly entry?: BrowserErrorLogEntry
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {}

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const entry = createBrowserErrorLogEntry({
      source: 'react_boundary',
      error,
      detail: info.componentStack ?? undefined,
    })

    if (this.props.storage) {
      appendBrowserErrorLog(this.props.storage, entry)
    }

    this.setState({ entry })
  }

  render() {
    if (!this.state.entry) {
      return this.props.children
    }

    return (
      <main className="app-shell">
        <section className="app-error-boundary" aria-label="错误记录" role="alert">
          <p className="panel-kicker">试玩错误记录</p>
          <h2>这一页暂时停住了</h2>
          <p>请把下面这段问题信息和刚才的操作一起发给开发者。刷新页面后可以继续尝试。</p>
          <pre>{formatBrowserErrorReport(this.state.entry)}</pre>
          <button type="button" onClick={reloadPage}>
            刷新页面
          </button>
        </section>
      </main>
    )
  }
}

function reloadPage() {
  if (typeof window === 'undefined') {
    return
  }

  window.location.reload()
}
