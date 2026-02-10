export type SupervisorEventType =
  | 'run_started'
  | 'intent_classified'
  | 'route_selected'
  | 'gate_started'
  | 'gate_passed'
  | 'gate_failed'
  | 'autofix_started'
  | 'autofix_succeeded'
  | 'autofix_failed'
  | 'fallback_invoked'
  | 'run_completed'

export interface SupervisorEvent {
  event: SupervisorEventType
  timestamp: string
  run_id: string
  stage: string
  summary: string
  details: Record<string, unknown>
}

export function makeSupervisorEvent(input: {
  event: SupervisorEventType
  runId: string
  stage: string
  summary: string
  details?: Record<string, unknown>
}): SupervisorEvent {
  return {
    event: input.event,
    timestamp: new Date().toISOString(),
    run_id: input.runId,
    stage: input.stage,
    summary: input.summary,
    details: input.details || {},
  }
}

export function formatSupervisorEventLine(event: SupervisorEvent): string {
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return `[${time}] ${event.summary}`
}
