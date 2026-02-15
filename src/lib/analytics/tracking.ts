/**
 * Analytics Tracking Module
 * Tracks execution metrics, user behavior, and performance in production
 */

import { useCallback, useEffect } from 'react'

export interface ExecutionAnalytics {
  runId: string
  timestamp: number
  projectId?: string
  userId?: string
  agentId?: string
  executionTime: number
  status: 'success' | 'error' | 'cancelled'
  cost: number
  tokensUsed: number
  toolCalls: number
  errorType?: string
  errorMessage?: string
  retryCount: number
  userAction?: string // 'start', 'cancel', 'retry'
}

export interface PerformanceAnalytics {
  componentName: string
  renderTime: number
  memoHits: number
  memoMisses: number
  timestamp: number
}

export interface UserAnalytics {
  event: string
  userId?: string
  projectId?: string
  metadata?: Record<string, any>
  timestamp: number
}

/**
 * Execution metrics tracker
 */
class ExecutionAnalyticsCollector {
  private events: ExecutionAnalytics[] = []
  private batchSize = 10
  private flushInterval = 30000 // 30 seconds

  constructor(private endpoint: string = '/api/analytics/execution') {
    this.startBatchFlusher()
  }

  private startBatchFlusher() {
    if (typeof window === 'undefined') return

    setInterval(() => {
      if (this.events.length > 0) {
        this.flush()
      }
    }, this.flushInterval)
  }

  record(event: ExecutionAnalytics) {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    })

    if (this.events.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush() {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      })
    } catch (error) {
      console.error('Failed to flush execution analytics:', error)
      // Re-add events to retry
      this.events = [...eventsToSend, ...this.events].slice(0, 100) // Keep max 100
    }
  }
}

/**
 * Performance metrics tracker
 */
class PerformanceAnalyticsCollector {
  private events: PerformanceAnalytics[] = []
  private batchSize = 20

  constructor(private endpoint: string = '/api/analytics/performance') {}

  record(event: PerformanceAnalytics) {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    })

    if (this.events.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush() {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      })
    } catch (error) {
      console.error('Failed to flush performance analytics:', error)
      this.events = [...eventsToSend, ...this.events].slice(0, 100)
    }
  }
}

/**
 * User behavior tracker
 */
class UserAnalyticsCollector {
  private events: UserAnalytics[] = []
  private batchSize = 50

  constructor(private endpoint: string = '/api/analytics/user') {}

  record(event: Omit<UserAnalytics, 'timestamp'> | UserAnalytics) {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    })

    if (this.events.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush() {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      })
    } catch (error) {
      console.error('Failed to flush user analytics:', error)
      this.events = [...eventsToSend, ...this.events].slice(0, 500)
    }
  }
}

// Global collectors
const executionCollector = new ExecutionAnalyticsCollector()
const performanceCollector = new PerformanceAnalyticsCollector()
const userCollector = new UserAnalyticsCollector()

/**
 * Hook to track execution metrics
 */
export function useExecutionAnalytics() {
  return useCallback(
    (analytics: Omit<ExecutionAnalytics, 'timestamp'>) => {
      executionCollector.record(analytics as ExecutionAnalytics)

      // Also track as user event
      userCollector.record({
        event: `execution_${analytics.status}`,
        userId: analytics.userId,
        projectId: analytics.projectId,
        metadata: {
          runId: analytics.runId,
          executionTime: analytics.executionTime,
          cost: analytics.cost,
        },
      })
    },
    []
  )
}

/**
 * Hook to track performance metrics
 */
export function usePerformanceAnalytics() {
  return useCallback((analytics: Omit<PerformanceAnalytics, 'timestamp'>) => {
    performanceCollector.record(analytics as PerformanceAnalytics)
  }, [])
}

/**
 * Hook to track user events
 */
export function useUserAnalytics() {
  return useCallback((event: Omit<UserAnalytics, 'timestamp'>) => {
    userCollector.record(event as UserAnalytics)
  }, [])
}

/**
 * Initialize analytics in component
 * Tracks when components mount and perform actions
 */
export function useAnalyticsTracker(componentName: string, userId?: string) {
  const trackExecution = useExecutionAnalytics()
  const trackPerformance = usePerformanceAnalytics()
  const trackEvent = useUserAnalytics()

  useEffect(() => {
    // Track component mount
    trackEvent({
      event: `component_mounted`,
      userId,
      metadata: { componentName },
    })

    return () => {
      // Track component unmount
      trackEvent({
        event: `component_unmounted`,
        userId,
        metadata: { componentName },
      })
    }
  }, [componentName, trackEvent, userId])

  return {
    trackExecution,
    trackPerformance,
    trackEvent,
  }
}

/**
 * Flush all analytics
 */
export async function flushAllAnalytics() {
  await Promise.all([
    executionCollector.flush(),
    performanceCollector.flush(),
    userCollector.flush(),
  ])
}

/**
 * Enable analytics collection
 * Should be called once during app initialization
 */
export function enableAnalytics() {
  if (typeof window === 'undefined') return

  // Setup page unload handler to flush before leaving
  window.addEventListener('beforeunload', () => {
    flushAllAnalytics()
  })

  // Also flush periodically
  setInterval(() => {
    executionCollector.flush()
    performanceCollector.flush()
    userCollector.flush()
  }, 60000) // Every minute

  console.debug('[ANALYTICS] Analytics collection enabled')
}

/**
 * Export collectors for direct access
 */
export { executionCollector, performanceCollector, userCollector }
