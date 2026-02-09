function sanitizeSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')

  if (!normalized) return 'default'
  return normalized.slice(0, 120)
}

export function resolveScopedProjectId(userId: string, incomingProjectId?: string): string {
  const incoming = incomingProjectId?.trim()

  // Preserve the historical default key when no explicit project id exists.
  if (!incoming) {
    return `user-${userId}`
  }

  return `user-${userId}::${sanitizeSegment(incoming)}`
}

export function sanitizeProjectSegment(value: string): string {
  return sanitizeSegment(value)
}
