const TRANSIENT_PATTERNS = [
  'timeout',
  'timed out',
  'rate limit',
  'too many requests',
  '503',
  '502',
  '500',
  'service unavailable',
  'model overloaded',
  'temporarily unavailable',
]

export function isTransientModelError(message: string): boolean {
  const normalized = message.toLowerCase()
  return TRANSIENT_PATTERNS.some((pattern) => normalized.includes(pattern))
}
