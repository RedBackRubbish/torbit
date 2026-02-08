/**
 * TORBIT - Time-to-First-Success Metrics
 * 
 * Phase 6: Internal tracking only. No dashboards. No UI. Just data.
 * 
 * Tracked metrics:
 * - % of builds reaching "Verified"
 * - % of exports opened
 * - % of exports deployed
 * - Median time from prompt → verified preview
 */

import { trackMetricEvent } from './telemetry'
import { getMetricsProjectContext } from './context'

// ============================================
// METRIC TYPES
// ============================================

export interface SuccessMetrics {
  // Build funnel
  buildsStarted: number
  buildsCompleted: number
  buildsVerified: number
  
  // Export funnel
  exportsInitiated: number
  exportsDownloaded: number
  exportsOpened: number  // Tracked via first-run hint dismissal
  exportsDeployed: number
  
  // Time metrics (in milliseconds)
  promptToPreviewTimes: number[]
  promptToVerifiedTimes: number[]
  
  // Session tracking
  sessionId: string
  firstEventAt: number
  lastEventAt: number
}

export interface MetricEvent {
  type: MetricEventType
  timestamp: number
  metadata?: Record<string, unknown>
}

export type MetricEventType = 
  | 'build_started'
  | 'build_completed'
  | 'build_verified'
  | 'preview_shown'
  | 'export_initiated'
  | 'export_downloaded'
  | 'export_opened'
  | 'export_deployed'
  | 'prompt_to_verified'
  // Feature interest signals (disabled features clicked)
  | 'feature_interest_capacitor'

// ============================================
// METRIC STORAGE
// ============================================

const STORAGE_KEY = 'torbit_success_metrics'
const SESSION_KEY = 'torbit_session_id'

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

function getMetrics(): SuccessMetrics {
  if (typeof window === 'undefined') return createEmptyMetrics()
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as SuccessMetrics
    }
  } catch {
    // Ignore parse errors
  }
  
  return createEmptyMetrics()
}

function saveMetrics(metrics: SuccessMetrics): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics))
  } catch {
    // Ignore storage errors
  }
}

function createEmptyMetrics(): SuccessMetrics {
  return {
    buildsStarted: 0,
    buildsCompleted: 0,
    buildsVerified: 0,
    exportsInitiated: 0,
    exportsDownloaded: 0,
    exportsOpened: 0,
    exportsDeployed: 0,
    promptToPreviewTimes: [],
    promptToVerifiedTimes: [],
    sessionId: getSessionId(),
    firstEventAt: 0,
    lastEventAt: 0,
  }
}

// ============================================
// METRIC RECORDING
// ============================================

/**
 * Record a metric event. Internal only.
 */
export function recordMetric(type: MetricEventType, metadata?: Record<string, unknown>): void {
  const metrics = getMetrics()
  const now = Date.now()
  
  // Update timestamps
  if (metrics.firstEventAt === 0) {
    metrics.firstEventAt = now
  }
  metrics.lastEventAt = now
  
  // Update counters
  switch (type) {
    case 'build_started':
      metrics.buildsStarted++
      break
    case 'build_completed':
      metrics.buildsCompleted++
      break
    case 'build_verified':
      metrics.buildsVerified++
      break
    case 'export_initiated':
      metrics.exportsInitiated++
      break
    case 'export_downloaded':
      metrics.exportsDownloaded++
      break
    case 'export_opened':
      metrics.exportsOpened++
      break
    case 'export_deployed':
      metrics.exportsDeployed++
      break
    case 'preview_shown':
      // Track time from prompt to preview
      if (metadata?.promptStartTime) {
        const elapsed = now - (metadata.promptStartTime as number)
        metrics.promptToPreviewTimes.push(elapsed)
      }
      break
  }
  
  saveMetrics(metrics)

  const projectId = typeof metadata?.projectId === 'string'
    ? metadata.projectId
    : getMetricsProjectContext()

  trackMetricEvent({
    name: type,
    metadata,
    projectId,
    timestamp: now,
  })
}

/**
 * Record time from prompt to verified
 */
export function recordPromptToVerified(promptStartTime: number): void {
  const metrics = getMetrics()
  const now = Date.now()
  const elapsed = now - promptStartTime
  metrics.promptToVerifiedTimes.push(elapsed)
  saveMetrics(metrics)

  trackMetricEvent({
    name: 'prompt_to_verified',
    metadata: { elapsedMs: elapsed },
    projectId: getMetricsProjectContext(),
    timestamp: now,
  })
}

// ============================================
// METRIC CALCULATIONS (Internal Only)
// ============================================

/**
 * Calculate success rates. For internal analysis only.
 */
export function calculateSuccessRates(): {
  buildVerificationRate: number
  exportOpenRate: number
  exportDeployRate: number
  medianPromptToPreview: number
  medianPromptToVerified: number
} {
  const metrics = getMetrics()
  
  const buildVerificationRate = metrics.buildsStarted > 0
    ? (metrics.buildsVerified / metrics.buildsStarted) * 100
    : 0
  
  const exportOpenRate = metrics.exportsDownloaded > 0
    ? (metrics.exportsOpened / metrics.exportsDownloaded) * 100
    : 0
  
  const exportDeployRate = metrics.exportsOpened > 0
    ? (metrics.exportsDeployed / metrics.exportsOpened) * 100
    : 0
  
  const medianPromptToPreview = calculateMedian(metrics.promptToPreviewTimes)
  const medianPromptToVerified = calculateMedian(metrics.promptToVerifiedTimes)
  
  return {
    buildVerificationRate,
    exportOpenRate,
    exportDeployRate,
    medianPromptToPreview,
    medianPromptToVerified,
  }
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// ============================================
// DEBUG (Development Only)
// ============================================

/**
 * Get raw metrics for debugging. Development only.
 */
export function getDebugMetrics(): SuccessMetrics & ReturnType<typeof calculateSuccessRates> {
  return {
    ...getMetrics(),
    ...calculateSuccessRates(),
  }
}

/**
 * Reset metrics. Development only.
 */
export function resetMetrics(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
