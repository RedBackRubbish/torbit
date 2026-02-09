import { describe, expect, it } from 'vitest'
import { buildMetricsSummary } from './summary'

describe('buildMetricsSummary', () => {
  it('computes funnel rates and p50 latency', () => {
    const summary = buildMetricsSummary([
      { event_name: 'build_started', occurred_at: '2026-02-08T10:00:00.000Z', event_data: {} },
      { event_name: 'build_started', occurred_at: '2026-02-08T10:01:00.000Z', event_data: {} },
      { event_name: 'build_completed', occurred_at: '2026-02-08T10:02:00.000Z', event_data: {} },
      { event_name: 'build_verified', occurred_at: '2026-02-08T10:03:00.000Z', event_data: {} },
      { event_name: 'export_downloaded', occurred_at: '2026-02-08T10:04:00.000Z', event_data: {} },
      { event_name: 'export_opened', occurred_at: '2026-02-08T10:05:00.000Z', event_data: {} },
      { event_name: 'export_deployed', occurred_at: '2026-02-08T10:06:00.000Z', event_data: {} },
      { event_name: 'pr_created', occurred_at: '2026-02-08T10:06:30.000Z', event_data: {} },
      { event_name: 'pr_mergeable', occurred_at: '2026-02-08T10:06:40.000Z', event_data: {} },
      { event_name: 'pr_mergeable_without_rescue', occurred_at: '2026-02-08T10:06:50.000Z', event_data: {} },
      { event_name: 'prompt_to_verified', occurred_at: '2026-02-08T10:07:00.000Z', event_data: { elapsedMs: 1200 } },
      { event_name: 'prompt_to_verified', occurred_at: '2026-02-08T10:08:00.000Z', event_data: { elapsedMs: 1800 } },
      { event_name: 'prompt_to_verified', occurred_at: '2026-02-08T10:09:00.000Z', event_data: { elapsedMs: 2200 } },
    ])

    expect(summary.totalEvents).toBe(13)
    expect(summary.rates.buildCompletionRate).toBe(50)
    expect(summary.rates.buildVerificationRate).toBe(50)
    expect(summary.rates.mergeablePRRate).toBe(100)
    expect(summary.rates.promptToMergeablePRWithoutRescueRate).toBe(50)
    expect(summary.rates.exportOpenRate).toBe(100)
    expect(summary.rates.exportDeployRate).toBe(100)
    expect(summary.latency.promptToVerifiedSamples).toBe(3)
    expect(summary.latency.promptToVerifiedP50Ms).toBe(1800)
    expect(summary.activityByDay).toEqual([{ day: '2026-02-08', count: 13 }])
  })

  it('handles empty inputs safely', () => {
    const summary = buildMetricsSummary([])

    expect(summary.totalEvents).toBe(0)
    expect(summary.rates.buildCompletionRate).toBe(0)
    expect(summary.latency.promptToVerifiedP50Ms).toBe(0)
    expect(summary.activityByDay).toEqual([])
  })
})
