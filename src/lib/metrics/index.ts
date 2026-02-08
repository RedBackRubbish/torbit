/**
 * TORBIT - Metrics
 * 
 * Internal tracking only. No dashboards. No UI.
 */

export { 
  recordMetric, 
  recordPromptToVerified,
  calculateSuccessRates,
  getDebugMetrics,
  resetMetrics,
  type SuccessMetrics,
  type MetricEvent,
  type MetricEventType,
} from './success'

export {
  trackMetricEvent,
  flushQueuedTelemetryEvents,
  type TelemetryEventInput,
} from './telemetry'

export {
  setMetricsProjectContext,
  getMetricsProjectContext,
} from './context'

export {
  buildMetricsSummary,
  type ProductEventRecord,
  type MetricsSummary,
} from './summary'
