let metricsProjectContext: string | null = null

export function setMetricsProjectContext(projectId: string | null | undefined): void {
  const normalized = typeof projectId === 'string' ? projectId.trim() : ''
  metricsProjectContext = normalized.length > 0 ? normalized : null
}

export function getMetricsProjectContext(): string | undefined {
  return metricsProjectContext || undefined
}
