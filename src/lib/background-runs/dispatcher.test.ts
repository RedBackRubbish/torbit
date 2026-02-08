import { describe, expect, it } from 'vitest'
import {
  computeRetryDelaySeconds,
  isBackgroundRunHeartbeatStale,
} from './dispatcher'

describe('computeRetryDelaySeconds', () => {
  it('starts at 30 seconds for first retry', () => {
    expect(computeRetryDelaySeconds(1)).toBe(30)
  })

  it('doubles with each attempt', () => {
    expect(computeRetryDelaySeconds(2)).toBe(60)
    expect(computeRetryDelaySeconds(3)).toBe(120)
    expect(computeRetryDelaySeconds(4)).toBe(240)
  })

  it('caps backoff at 15 minutes', () => {
    expect(computeRetryDelaySeconds(10)).toBe(900)
    expect(computeRetryDelaySeconds(20)).toBe(900)
  })
})

describe('isBackgroundRunHeartbeatStale', () => {
  it('uses last heartbeat when available', () => {
    const stale = isBackgroundRunHeartbeatStale({
      created_at: '2026-02-08T10:00:00.000Z',
      started_at: '2026-02-08T10:01:00.000Z',
      last_heartbeat_at: '2026-02-08T10:05:00.000Z',
    }, {
      now: new Date('2026-02-08T10:20:01.000Z'),
      staleAfterSeconds: 900,
    })

    expect(stale).toBe(true)
  })

  it('falls back to started_at when heartbeat is missing', () => {
    const stale = isBackgroundRunHeartbeatStale({
      created_at: '2026-02-08T10:00:00.000Z',
      started_at: '2026-02-08T10:10:00.000Z',
      last_heartbeat_at: null,
    }, {
      now: new Date('2026-02-08T10:20:00.000Z'),
      staleAfterSeconds: 900,
    })

    expect(stale).toBe(false)
  })

  it('falls back to created_at when started_at is missing', () => {
    const stale = isBackgroundRunHeartbeatStale({
      created_at: '2026-02-08T10:00:00.000Z',
      started_at: null,
      last_heartbeat_at: null,
    }, {
      now: new Date('2026-02-08T10:11:00.000Z'),
      staleAfterSeconds: 600,
    })

    expect(stale).toBe(true)
  })

  it('returns false when timestamps are invalid', () => {
    const stale = isBackgroundRunHeartbeatStale({
      created_at: 'invalid',
      started_at: null,
      last_heartbeat_at: null,
    }, {
      now: new Date('2026-02-08T10:11:00.000Z'),
      staleAfterSeconds: 600,
    })

    expect(stale).toBe(false)
  })
})
