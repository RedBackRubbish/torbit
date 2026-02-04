/**
 * Performance Monitoring Utilities
 * 
 * Provides a unified interface for performance tracking that works with:
 * - Sentry Performance
 * - Web Vitals
 * - Custom metrics
 * 
 * @example
 * const span = performance.startSpan('fetchData')
 * await fetchData()
 * span.end()
 */

import * as Sentry from '@sentry/nextjs'

// ============================================================================
// Types
// ============================================================================

export interface PerformanceSpan {
  end: () => void
  setData: (key: string, value: unknown) => void
  setStatus: (status: 'ok' | 'error') => void
}

export interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

// ============================================================================
// Span Management
// ============================================================================

/**
 * Start a performance span for tracking an operation
 */
export function startSpan(name: string, op: string = 'function'): PerformanceSpan {
  const span = Sentry.startInactiveSpan({
    name,
    op,
  })

  return {
    end: () => span?.end(),
    setData: (key: string, value: unknown) => {
      span?.setAttribute(key, String(value))
    },
    setStatus: (status: 'ok' | 'error') => {
      span?.setStatus({ code: status === 'ok' ? 1 : 2, message: status })
    },
  }
}

/**
 * Wrap an async function with performance tracking
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  op: string = 'function'
): Promise<T> {
  return Sentry.startSpan({ name, op }, async () => {
    return fn()
  })
}

/**
 * Track a specific metric
 */
export function trackMetric(name: string, value: number, unit: string = ''): void {
  Sentry.setMeasurement(name, value, unit as 'second' | 'millisecond')
}

// ============================================================================
// Web Vitals
// ============================================================================

/**
 * Report Web Vitals to Sentry
 * Call this from your app's reportWebVitals
 */
export function reportWebVitals(metric: WebVitalMetric): void {
  const { name, value, rating } = metric
  
  // Map Web Vitals to Sentry
  const metricName = name.toLowerCase()
  trackMetric(`web_vital.${metricName}`, value, 'millisecond')

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WebVitals] ${name}: ${value.toFixed(2)}ms (${rating})`)
  }
}

// ============================================================================
// Custom Performance Marks
// ============================================================================

const marks = new Map<string, number>()

/**
 * Start a performance mark
 */
export function mark(name: string): void {
  marks.set(name, performance.now())
}

/**
 * Measure time since a mark
 */
export function measure(name: string, markName: string): number | null {
  const startTime = marks.get(markName)
  if (startTime === undefined) {
    console.warn(`[Performance] Mark "${markName}" not found`)
    return null
  }

  const duration = performance.now() - startTime
  trackMetric(name, duration, 'millisecond')
  marks.delete(markName)
  
  return duration
}

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
): string {
  return Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture a message with severity
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): string {
  return Sentry.captureMessage(message, level)
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  })
}

// ============================================================================
// Performance Budget
// ============================================================================

export interface PerformanceBudget {
  name: string
  budget: number
  actual: number
  passed: boolean
}

const budgets: Record<string, number> = {
  'chat.send': 2000,      // 2s max for sending a message
  'file.save': 1000,      // 1s max for saving a file
  'preview.load': 5000,   // 5s max for preview to load
  'agent.respond': 10000, // 10s max for agent response
}

/**
 * Check if an operation is within performance budget
 */
export function checkBudget(name: string, duration: number): PerformanceBudget | null {
  const budget = budgets[name]
  if (budget === undefined) {
    return null
  }

  const passed = duration <= budget
  const result: PerformanceBudget = {
    name,
    budget,
    actual: duration,
    passed,
  }

  if (!passed) {
    captureMessage(`Performance budget exceeded: ${name} (${duration}ms > ${budget}ms)`, 'warning')
  }

  return result
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Log performance metrics in development
 */
export function logPerformance(): void {
  if (process.env.NODE_ENV !== 'development') return

  const entries = performance.getEntriesByType('measure')
  if (entries.length === 0) return

  console.group('[Performance Metrics]')
  entries.forEach(entry => {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`)
  })
  console.groupEnd()
}

// ============================================================================
// Exports
// ============================================================================

export const monitoring = {
  startSpan,
  withSpan,
  trackMetric,
  reportWebVitals,
  mark,
  measure,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  checkBudget,
  logPerformance,
}

export default monitoring
