export interface ApiErrorPayload {
  code: string
  message: string
  retryable: boolean
  details?: Record<string, unknown>
}

export interface ApiErrorEnvelope {
  success: false
  error: ApiErrorPayload
  degraded?: boolean
  warning?: string
}

export function makeApiErrorEnvelope(input: {
  code: string
  message: string
  retryable?: boolean
  degraded?: boolean
  warning?: string
  details?: Record<string, unknown>
}): ApiErrorEnvelope {
  return {
    success: false,
    degraded: input.degraded || undefined,
    warning: input.warning,
    error: {
      code: input.code,
      message: input.message,
      retryable: input.retryable ?? false,
      ...(input.details ? { details: input.details } : {}),
    },
  }
}

export function readApiErrorMessage(errorValue: unknown, fallback = 'Request failed.'): string {
  if (typeof errorValue === 'string' && errorValue.trim().length > 0) {
    return errorValue
  }

  if (errorValue && typeof errorValue === 'object') {
    const candidate = errorValue as { message?: unknown }
    if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
      return candidate.message
    }
  }

  return fallback
}

