import { describe, expect, it } from 'vitest'
import { formatSupervisorEventLine, makeSupervisorEvent } from './events'

describe('makeSupervisorEvent', () => {
  it('creates normalized event payload', () => {
    const event = makeSupervisorEvent({
      event: 'run_started',
      runId: 'run-123',
      stage: 'intent',
      summary: 'Run started',
      details: { intent: 'edit' },
    })

    expect(event.event).toBe('run_started')
    expect(event.run_id).toBe('run-123')
    expect(event.stage).toBe('intent')
    expect(event.details).toEqual({ intent: 'edit' })
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('formatSupervisorEventLine', () => {
  it('formats a human-readable line', () => {
    const line = formatSupervisorEventLine({
      event: 'gate_started',
      timestamp: '2026-02-10T18:00:00.000Z',
      run_id: 'run-123',
      stage: 'quality',
      summary: 'Quality gate started',
      details: {},
    })

    expect(line).toContain('Quality gate started')
    expect(line).toContain('[')
  })
})
