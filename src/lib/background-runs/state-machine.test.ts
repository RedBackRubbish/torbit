import { describe, expect, it } from 'vitest'
import {
  computeBackgroundRunTransition,
  type BackgroundRunRecord,
} from './state-machine'

function baseRun(overrides: Partial<BackgroundRunRecord> = {}): BackgroundRunRecord {
  return {
    status: 'queued',
    progress: 0,
    attempt_count: 0,
    max_attempts: 3,
    retryable: true,
    cancel_requested: false,
    started_at: null,
    finished_at: null,
    ...overrides,
  }
}

describe('background run state machine', () => {
  it('starts queued runs and increments attempt count', () => {
    const now = new Date('2026-02-08T12:00:00.000Z')
    const result = computeBackgroundRunTransition(baseRun(), { operation: 'start' }, now)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.mutation.status).toBe('running')
    expect(result.mutation.attempt_count).toBe(1)
    expect(result.mutation.started_at).toBe('2026-02-08T12:00:00.000Z')
  })

  it('prevents start when max attempts are reached', () => {
    const result = computeBackgroundRunTransition(
      baseRun({ attempt_count: 3, max_attempts: 3 }),
      { operation: 'start' }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('max_attempts_reached')
  })

  it('marks complete from running and sets finished timestamp', () => {
    const now = new Date('2026-02-08T12:05:00.000Z')
    const result = computeBackgroundRunTransition(
      baseRun({ status: 'running', attempt_count: 1, started_at: '2026-02-08T12:00:00.000Z' }),
      { operation: 'complete', output: { link: 'https://example.com' } },
      now
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.mutation.status).toBe('succeeded')
    expect(result.mutation.progress).toBe(100)
    expect(result.mutation.finished_at).toBe('2026-02-08T12:05:00.000Z')
  })

  it('allows retry from failed and schedules next retry time', () => {
    const now = new Date('2026-02-08T12:10:00.000Z')
    const result = computeBackgroundRunTransition(
      baseRun({ status: 'failed', attempt_count: 1, max_attempts: 3, retryable: true }),
      { operation: 'retry', retryAfterSeconds: 30 },
      now
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.mutation.status).toBe('queued')
    expect(result.mutation.progress).toBe(0)
    expect(result.mutation.next_retry_at).toBe('2026-02-08T12:10:30.000Z')
  })

  it('rejects retry for non-retryable runs', () => {
    const result = computeBackgroundRunTransition(
      baseRun({ status: 'failed', retryable: false, attempt_count: 1 }),
      { operation: 'retry' }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('not_retryable')
  })

  it('supports legacy payload status mapping for compatibility', () => {
    const result = computeBackgroundRunTransition(
      baseRun({ status: 'running', attempt_count: 1 }),
      { status: 'failed', errorMessage: 'boom' }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.operation).toBe('fail')
    expect(result.mutation.status).toBe('failed')
    expect(result.mutation.error_message).toBe('boom')
  })
})
