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
      { event_name: 'chat.requested', occurred_at: '2026-02-08T10:10:00.000Z', event_data: {} },
      { event_name: 'chat.requested', occurred_at: '2026-02-08T10:10:10.000Z', event_data: {} },
      { event_name: 'chat.reply_latency', occurred_at: '2026-02-08T10:10:20.000Z', event_data: { elapsedMs: 600 } },
      { event_name: 'chat.reply_latency', occurred_at: '2026-02-08T10:10:30.000Z', event_data: { elapsedMs: 900 } },
      { event_name: 'chat.no_reply', occurred_at: '2026-02-08T10:10:40.000Z', event_data: {} },
      { event_name: 'api.project_presence.request', occurred_at: '2026-02-08T10:11:00.000Z', event_data: {} },
      { event_name: 'api.project_presence.error_404', occurred_at: '2026-02-08T10:11:10.000Z', event_data: {} },
      { event_name: 'api.background_runs.request', occurred_at: '2026-02-08T10:11:20.000Z', event_data: {} },
      { event_name: 'api.background_runs.error_500', occurred_at: '2026-02-08T10:11:30.000Z', event_data: {} },
    ])

    expect(summary.totalEvents).toBe(22)
    expect(summary.rates.buildCompletionRate).toBe(50)
    expect(summary.rates.buildVerificationRate).toBe(50)
    expect(summary.rates.mergeablePRRate).toBe(100)
    expect(summary.rates.promptToMergeablePRWithoutRescueRate).toBe(50)
    expect(summary.rates.exportOpenRate).toBe(100)
    expect(summary.rates.exportDeployRate).toBe(100)
    expect(summary.latency.promptToVerifiedSamples).toBe(3)
    expect(summary.latency.promptToVerifiedP50Ms).toBe(1800)
    expect(summary.slo.chatReplyLatencySamples).toBe(2)
    expect(summary.slo.chatReplyLatencyP50Ms).toBe(750)
    expect(summary.slo.chatNoReplyRate).toBe(50)
    expect(summary.slo.api404Rate).toBe(50)
    expect(summary.slo.api500Rate).toBe(50)
    expect(summary.slo.presence404Rate).toBe(100)
    expect(summary.slo.backgroundRuns500Rate).toBe(100)
    expect(summary.activityByDay).toEqual([{ day: '2026-02-08', count: 22 }])
  })

  it('handles empty inputs safely', () => {
    const summary = buildMetricsSummary([])

    expect(summary.totalEvents).toBe(0)
    expect(summary.rates.buildCompletionRate).toBe(0)
    expect(summary.latency.promptToVerifiedP50Ms).toBe(0)
    expect(summary.slo.chatNoReplyRate).toBe(0)
    expect(summary.slo.api404Rate).toBe(0)
    expect(summary.activityByDay).toEqual([])
  })
})
