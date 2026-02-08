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
    exportOpenRate: number
    exportDeployRate: number
  }
  latency: {
    promptToVerifiedP50Ms: number
    promptToVerifiedSamples: number
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
  const byDay: Record<string, number> = {}

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
  }

  const buildsStarted = eventCounts.build_started || 0
  const buildsCompleted = eventCounts.build_completed || 0
  const buildsVerified = eventCounts.build_verified || 0
  const exportsDownloaded = eventCounts.export_downloaded || 0
  const exportsOpened = eventCounts.export_opened || 0
  const exportsDeployed = eventCounts.export_deployed || 0

  return {
    totalEvents: events.length,
    eventCounts,
    rates: {
      buildCompletionRate: ratio(buildsCompleted, buildsStarted),
      buildVerificationRate: ratio(buildsVerified, buildsStarted),
      exportOpenRate: ratio(exportsOpened, exportsDownloaded),
      exportDeployRate: ratio(exportsDeployed, exportsOpened),
    },
    latency: {
      promptToVerifiedP50Ms: median(promptToVerifiedValues),
      promptToVerifiedSamples: promptToVerifiedValues.length,
    },
    activityByDay: Object.entries(byDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  }
}
