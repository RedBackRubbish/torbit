export interface TelemetryEventInput {
  name: string
  metadata?: Record<string, unknown>
  projectId?: string
  sessionId?: string
  timestamp?: number
}

interface TelemetryEventPayload {
  name: string
  timestamp: number
  sessionId: string
  projectId?: string
  metadata?: Record<string, unknown>
}

const SESSION_KEY = 'torbit_session_id'
const QUEUE_KEY = 'torbit_metric_event_queue'
const MAX_QUEUE_EVENTS = 100

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'

  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing

  const next = generateSessionId()
  sessionStorage.setItem(SESSION_KEY, next)
  return next
}

function readQueue(): TelemetryEventPayload[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const events: TelemetryEventPayload[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const candidate = item as Record<string, unknown>
      if (typeof candidate.name !== 'string') continue
      if (typeof candidate.timestamp !== 'number') continue
      if (typeof candidate.sessionId !== 'string') continue

      events.push({
        name: candidate.name,
        timestamp: candidate.timestamp,
        sessionId: candidate.sessionId,
        projectId: typeof candidate.projectId === 'string' ? candidate.projectId : undefined,
        metadata: (candidate.metadata && typeof candidate.metadata === 'object')
          ? candidate.metadata as Record<string, unknown>
          : undefined,
      })
    }
    return events
  } catch {
    return []
  }
}

function writeQueue(events: TelemetryEventPayload[]): void {
  if (typeof window === 'undefined') return

  try {
    const bounded = events.slice(-MAX_QUEUE_EVENTS)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(bounded))
  } catch {
    // Ignore storage errors
  }
}

function enqueueEvent(event: TelemetryEventPayload): void {
  const queued = readQueue()
  queued.push(event)
  writeQueue(queued)
}

async function postEvents(events: TelemetryEventPayload[]): Promise<void> {
  if (events.length === 0) return

  const response = await fetch('/api/metrics/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events }),
    keepalive: true,
  })

  if (!response.ok) {
    throw new Error(`Metrics ingestion failed (${response.status})`)
  }
}

export async function flushQueuedTelemetryEvents(): Promise<void> {
  if (typeof window === 'undefined') return

  const queued = readQueue()
  if (queued.length === 0) return

  await postEvents(queued)
  writeQueue([])
}

export function trackMetricEvent(input: TelemetryEventInput): void {
  if (typeof window === 'undefined') return

  const event: TelemetryEventPayload = {
    name: input.name,
    timestamp: input.timestamp ?? Date.now(),
    sessionId: input.sessionId || getSessionId(),
    projectId: input.projectId,
    metadata: input.metadata,
  }

  void (async () => {
    try {
      // Flush backlog first to preserve event order.
      await flushQueuedTelemetryEvents()
      await postEvents([event])
    } catch {
      enqueueEvent(event)
    }
  })()
}
