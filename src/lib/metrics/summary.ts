import type { Json } from '@/lib/supabase/types'

export interface ProductEventRecord {
  event_name: string
  occurred_at: string
  event_data: Json
}

export interface MetricsSummary {
  totalEvents: number
  eventCounts: Record<string, number>
  rates: {
    buildCompletionRate: number
    buildVerificationRate: number
    mergeablePRRate: number
    promptToMergeablePRWithoutRescueRate: number
    exportOpenRate: number
    exportDeployRate: number
  }
  latency: {
    promptToVerifiedP50Ms: number
    promptToVerifiedSamples: number
  }
  slo: {
    chatReplyLatencyP50Ms: number
    chatReplyLatencySamples: number
    chatNoReplyRate: number
    api404Rate: number
    api500Rate: number
    presence404Rate: number
    presence500Rate: number
    backgroundRuns404Rate: number
    backgroundRuns500Rate: number
  }
  activityByDay: Array<{ day: string; count: number }>
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return round2((numerator / denominator) * 100)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

export function buildMetricsSummary(events: ProductEventRecord[]): MetricsSummary {
  const eventCounts: Record<string, number> = {}
  const promptToVerifiedValues: number[] = []
  const chatReplyLatencyValues: number[] = []
  const byDay: Record<string, number> = {}

  let chatRequests = 0
  let chatNoReply = 0
  let apiRequests = 0
  let api404 = 0
  let api500 = 0
  let presenceRequests = 0
  let presence404 = 0
  let presence500 = 0
  let backgroundRequests = 0
  let background404 = 0
  let background500 = 0

  for (const event of events) {
    eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1

    const day = event.occurred_at.slice(0, 10)
    byDay[day] = (byDay[day] || 0) + 1

    if (event.event_name === 'prompt_to_verified') {
      const data = event.event_data && typeof event.event_data === 'object'
        ? event.event_data as Record<string, unknown>
        : null
      const elapsedMs = asNumber(data?.elapsedMs)
      if (elapsedMs !== null) {
        promptToVerifiedValues.push(elapsedMs)
      }
    }

    if (event.event_name === 'chat.reply_latency') {
      const data = event.event_data && typeof event.event_data === 'object'
        ? event.event_data as Record<string, unknown>
        : null
      const elapsedMs = asNumber(data?.elapsedMs)
      if (elapsedMs !== null) {
        chatReplyLatencyValues.push(elapsedMs)
      }
    }

    if (event.event_name === 'chat.requested') {
      chatRequests += 1
    }
    if (event.event_name === 'chat.no_reply') {
      chatNoReply += 1
    }

    if (event.event_name === 'api.project_presence.request') {
      apiRequests += 1
      presenceRequests += 1
    } else if (event.event_name === 'api.project_presence.error_404') {
      api404 += 1
      presence404 += 1
    } else if (event.event_name === 'api.project_presence.error_500') {
      api500 += 1
      presence500 += 1
    } else if (event.event_name === 'api.background_runs.request') {
      apiRequests += 1
      backgroundRequests += 1
    } else if (event.event_name === 'api.background_runs.error_404') {
      api404 += 1
      background404 += 1
    } else if (event.event_name === 'api.background_runs.error_500') {
      api500 += 1
      background500 += 1
    }
  }

  const buildsStarted = eventCounts.build_started || 0
  const buildsCompleted = eventCounts.build_completed || 0
  const buildsVerified = eventCounts.build_verified || 0
  const exportsDownloaded = eventCounts.export_downloaded || 0
  const exportsOpened = eventCounts.export_opened || 0
  const exportsDeployed = eventCounts.export_deployed || 0
  const prCreated = eventCounts.pr_created || 0
  const prMergeable = eventCounts.pr_mergeable || 0
  const prMergeableWithoutRescue = eventCounts.pr_mergeable_without_rescue || 0

  return {
    totalEvents: events.length,
    eventCounts,
    rates: {
      buildCompletionRate: ratio(buildsCompleted, buildsStarted),
      buildVerificationRate: ratio(buildsVerified, buildsStarted),
      mergeablePRRate: ratio(prMergeable, prCreated),
      promptToMergeablePRWithoutRescueRate: ratio(prMergeableWithoutRescue, buildsStarted),
      exportOpenRate: ratio(exportsOpened, exportsDownloaded),
      exportDeployRate: ratio(exportsDeployed, exportsOpened),
    },
    latency: {
      promptToVerifiedP50Ms: median(promptToVerifiedValues),
      promptToVerifiedSamples: promptToVerifiedValues.length,
    },
    slo: {
      chatReplyLatencyP50Ms: median(chatReplyLatencyValues),
      chatReplyLatencySamples: chatReplyLatencyValues.length,
      chatNoReplyRate: ratio(chatNoReply, chatRequests),
      api404Rate: ratio(api404, apiRequests),
      api500Rate: ratio(api500, apiRequests),
      presence404Rate: ratio(presence404, presenceRequests),
      presence500Rate: ratio(presence500, presenceRequests),
      backgroundRuns404Rate: ratio(background404, backgroundRequests),
      backgroundRuns500Rate: ratio(background500, backgroundRequests),
    },
    activityByDay: Object.entries(byDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  }
}
