export type BackgroundRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export type BackgroundRunOperation =
  | 'start'
  | 'progress'
  | 'complete'
  | 'fail'
  | 'request-cancel'
  | 'cancel'
  | 'retry'
  | 'heartbeat'

export interface BackgroundRunRecord {
  status: BackgroundRunStatus
  progress: number
  attempt_count: number
  max_attempts: number
  retryable: boolean
  cancel_requested: boolean
  started_at: string | null
  finished_at: string | null
}

export interface BackgroundRunPatchInput {
  operation?: BackgroundRunOperation
  status?: BackgroundRunStatus // Legacy compatibility
  progress?: number
  output?: Record<string, unknown> | null
  errorMessage?: string | null
  retryAfterSeconds?: number
}

export type BackgroundRunMutation = {
  status?: BackgroundRunStatus
  progress?: number
  output?: Record<string, unknown> | null
  error_message?: string | null
  started_at?: string | null
  finished_at?: string | null
  next_retry_at?: string | null
  last_heartbeat_at?: string
  attempt_count?: number
  cancel_requested?: boolean
}

export type BackgroundRunTransitionResult =
  | {
      ok: true
      mutation: BackgroundRunMutation
      operation: BackgroundRunOperation
    }
  | {
      ok: false
      code: 'invalid_payload' | 'invalid_transition' | 'max_attempts_reached' | 'not_retryable'
      message: string
    }

function deriveOperation(input: BackgroundRunPatchInput): BackgroundRunOperation | null {
  if (input.operation) return input.operation

  if (input.status === 'running') return 'start'
  if (input.status === 'succeeded') return 'complete'
  if (input.status === 'failed') return 'fail'
  if (input.status === 'cancelled') return 'cancel'
  if (input.status === 'queued') return 'retry'

  if (typeof input.progress === 'number') return 'progress'

  return null
}

function isTerminal(status: BackgroundRunStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled'
}

function toIsoString(now: Date): string {
  return now.toISOString()
}

export function computeBackgroundRunTransition(
  current: BackgroundRunRecord,
  input: BackgroundRunPatchInput,
  now: Date = new Date()
): BackgroundRunTransitionResult {
  const operation = deriveOperation(input)

  if (!operation) {
    return {
      ok: false,
      code: 'invalid_payload',
      message: 'No valid operation could be derived from update payload.',
    }
  }

  if (isTerminal(current.status) && operation !== 'retry') {
    return {
      ok: false,
      code: 'invalid_transition',
      message: `Run is already ${current.status} and cannot transition via ${operation}.`,
    }
  }

  const timestamp = toIsoString(now)

  switch (operation) {
    case 'start': {
      if (current.status !== 'queued') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `start is only allowed from queued. Current status: ${current.status}.`,
        }
      }

      if (current.cancel_requested) {
        return {
          ok: false,
          code: 'invalid_transition',
          message: 'Run has a pending cancel request and cannot be started.',
        }
      }

      if (current.attempt_count >= current.max_attempts) {
        return {
          ok: false,
          code: 'max_attempts_reached',
          message: 'Run reached max attempts and cannot be started again.',
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          status: 'running',
          started_at: timestamp,
          finished_at: null,
          next_retry_at: null,
          attempt_count: current.attempt_count + 1,
          progress: typeof input.progress === 'number' ? input.progress : Math.max(1, current.progress),
        },
      }
    }

    case 'progress': {
      if (current.status !== 'running') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `progress is only allowed from running. Current status: ${current.status}.`,
        }
      }

      if (typeof input.progress !== 'number') {
        return {
          ok: false,
          code: 'invalid_payload',
          message: 'progress operation requires progress value.',
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          progress: input.progress,
        },
      }
    }

    case 'complete': {
      if (current.status !== 'running') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `complete is only allowed from running. Current status: ${current.status}.`,
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          status: 'succeeded',
          progress: 100,
          finished_at: timestamp,
          error_message: null,
          next_retry_at: null,
          output: input.output,
        },
      }
    }

    case 'fail': {
      if (current.status !== 'running' && current.status !== 'queued') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `fail is only allowed from queued or running. Current status: ${current.status}.`,
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          status: 'failed',
          finished_at: timestamp,
          next_retry_at: null,
          error_message: input.errorMessage ?? 'Run failed',
          output: input.output,
        },
      }
    }

    case 'request-cancel': {
      if (current.status !== 'queued' && current.status !== 'running') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `request-cancel is only allowed from queued or running. Current status: ${current.status}.`,
        }
      }

      if (current.status === 'queued') {
        return {
          ok: true,
          operation,
          mutation: {
            status: 'cancelled',
            cancel_requested: true,
            finished_at: timestamp,
            next_retry_at: null,
          },
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          cancel_requested: true,
        },
      }
    }

    case 'cancel': {
      if (current.status !== 'queued' && current.status !== 'running' && current.status !== 'failed') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `cancel is only allowed from queued, running, or failed. Current status: ${current.status}.`,
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          status: 'cancelled',
          cancel_requested: true,
          finished_at: timestamp,
          next_retry_at: null,
        },
      }
    }

    case 'retry': {
      if (current.status !== 'failed') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `retry is only allowed from failed. Current status: ${current.status}.`,
        }
      }

      if (!current.retryable) {
        return {
          ok: false,
          code: 'not_retryable',
          message: 'Run is not retryable.',
        }
      }

      if (current.attempt_count >= current.max_attempts) {
        return {
          ok: false,
          code: 'max_attempts_reached',
          message: 'Run reached max attempts and cannot be retried.',
        }
      }

      const retryAfterMs = Math.max(0, (input.retryAfterSeconds ?? 0) * 1000)
      const retryAt = new Date(now.getTime() + retryAfterMs)

      return {
        ok: true,
        operation,
        mutation: {
          status: 'queued',
          progress: 0,
          started_at: null,
          finished_at: null,
          error_message: null,
          cancel_requested: false,
          next_retry_at: toIsoString(retryAt),
        },
      }
    }

    case 'heartbeat': {
      if (current.status !== 'running') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: `heartbeat is only allowed from running. Current status: ${current.status}.`,
        }
      }

      return {
        ok: true,
        operation,
        mutation: {
          last_heartbeat_at: timestamp,
        },
      }
    }
  }
}
