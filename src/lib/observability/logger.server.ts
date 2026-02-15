import * as Sentry from '@sentry/nextjs'
import { getCorrelationId } from './correlation'
import { appendLog } from './datastore'

type Level = 'info' | 'warn' | 'error' | 'debug'
const SENTRY_LEVEL_MAP: Record<Level, 'info' | 'warning' | 'error' | 'debug'> = {
  info: 'info',
  warn: 'warning',
  error: 'error',
  debug: 'debug',
}

function formatLog(level: Level, msg: string, meta: Record<string, any> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message: msg,
    correlationId: (() => { try { return getCorrelationId() } catch { return undefined } })(),
    ...meta
  }
  return JSON.stringify(payload)
}

export function log(level: Level, message: string, meta: Record<string, any> = {}) {
  const line = formatLog(level, message, meta)
  // console
  if (level === 'error') console.error(line)
  else console.log(line)

  // Sentry (optional)
  try {
    if (level === 'error') Sentry.captureException(new Error(message))
    else Sentry.addBreadcrumb({ message, level: SENTRY_LEVEL_MAP[level] })
  } catch {
    // ignore Sentry failures
  }

  // datastore (append as JSONL)
  try {
    appendLog(line)
  } catch (e) {
    // swallow datastore errors to avoid breaking flows
    const reason = e instanceof Error ? e.message : String(e)
    console.error('Failed to write log to datastore:', reason)
  }
}

export const info = (msg: string, meta?: Record<string, any>) => log('info', msg, meta)
export const warn = (msg: string, meta?: Record<string, any>) => log('warn', msg, meta)
export const error = (msg: string, meta?: Record<string, any>) => log('error', msg, meta)
export const debug = (msg: string, meta?: Record<string, any>) => log('debug', msg, meta)

// For testing
export function _formatLogForTest(level: Level, message: string, meta: Record<string, any> = {}) {
  return formatLog(level, message, meta)
}
