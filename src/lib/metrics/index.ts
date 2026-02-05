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
