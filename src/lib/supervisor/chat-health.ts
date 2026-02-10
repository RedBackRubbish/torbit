const FAILURE_THRESHOLD = Number(process.env.TORBIT_CHAT_CB_FAILURE_THRESHOLD || 2)
const BASE_COOLDOWN_MS = Number(process.env.TORBIT_CHAT_CB_COOLDOWN_MS || 30_000)
const MAX_COOLDOWN_MS = Number(process.env.TORBIT_CHAT_CB_MAX_COOLDOWN_MS || 5 * 60_000)

interface ProviderHealthState {
  attempts: number
  successes: number
  failures: number
  consecutiveFailures: number
  lastFailureAt: number | null
  lastSuccessAt: number | null
  cooldownUntil: number | null
  averageLatencyMs: number | null
  lastError: string | null
}

export interface ProviderScore {
  label: string
  score: number
  circuitOpen: boolean
  cooldownMsRemaining: number
  successRate: number
  consecutiveFailures: number
  averageLatencyMs: number | null
  lastError: string | null
}

const providerHealth = new Map<string, ProviderHealthState>()

function getState(label: string): ProviderHealthState {
  const existing = providerHealth.get(label)
  if (existing) return existing

  const created: ProviderHealthState = {
    attempts: 0,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    lastFailureAt: null,
    lastSuccessAt: null,
    cooldownUntil: null,
    averageLatencyMs: null,
    lastError: null,
  }
  providerHealth.set(label, created)
  return created
}

function updateAverageLatency(previous: number | null, nextSampleMs: number): number {
  if (previous === null) return nextSampleMs
  // Exponential smoothing gives more weight to recent outcomes.
  return Math.round((previous * 0.7) + (nextSampleMs * 0.3))
}

function getCooldownMsRemaining(state: ProviderHealthState, now = Date.now()): number {
  if (!state.cooldownUntil) return 0
  return Math.max(0, state.cooldownUntil - now)
}

function getSuccessRate(state: ProviderHealthState): number {
  if (state.attempts === 0) return 1
  return state.successes / state.attempts
}

function computeProviderScore(label: string, now = Date.now()): ProviderScore {
  const state = getState(label)
  const cooldownMsRemaining = getCooldownMsRemaining(state, now)
  const circuitOpen = cooldownMsRemaining > 0
  const successRate = getSuccessRate(state)
  const latencyPenalty = state.averageLatencyMs ? Math.min(35, state.averageLatencyMs / 250) : 0
  const failurePenalty = Math.min(60, state.consecutiveFailures * 12)

  const score = circuitOpen
    ? -1000
    : (successRate * 100) - latencyPenalty - failurePenalty

  return {
    label,
    score,
    circuitOpen,
    cooldownMsRemaining,
    successRate,
    consecutiveFailures: state.consecutiveFailures,
    averageLatencyMs: state.averageLatencyMs,
    lastError: state.lastError,
  }
}

export function rankConversationProviders(labels: string[], now = Date.now()): {
  active: ProviderScore[]
  skipped: ProviderScore[]
} {
  const uniqueLabels = [...new Set(labels)]
  const scored = uniqueLabels.map((label) => computeProviderScore(label, now))
    .sort((a, b) => b.score - a.score)

  return {
    active: scored.filter((candidate) => !candidate.circuitOpen),
    skipped: scored.filter((candidate) => candidate.circuitOpen),
  }
}

export function recordConversationProviderSuccess(
  label: string,
  input: { latencyMs: number; now?: number }
): void {
  const now = input.now ?? Date.now()
  const state = getState(label)
  state.attempts += 1
  state.successes += 1
  state.consecutiveFailures = 0
  state.lastSuccessAt = now
  state.cooldownUntil = null
  state.lastError = null
  state.averageLatencyMs = updateAverageLatency(state.averageLatencyMs, Math.max(0, input.latencyMs))
}

export function recordConversationProviderFailure(
  label: string,
  input: { errorMessage: string; now?: number }
): void {
  const now = input.now ?? Date.now()
  const state = getState(label)
  state.attempts += 1
  state.failures += 1
  state.consecutiveFailures += 1
  state.lastFailureAt = now
  state.lastError = input.errorMessage

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    const exponent = Math.max(0, state.consecutiveFailures - FAILURE_THRESHOLD)
    const cooldownMs = Math.min(BASE_COOLDOWN_MS * (2 ** exponent), MAX_COOLDOWN_MS)
    state.cooldownUntil = now + cooldownMs
  }
}

export function getConversationProviderHealthSnapshot(now = Date.now()): ProviderScore[] {
  return [...providerHealth.keys()]
    .map((label) => computeProviderScore(label, now))
    .sort((a, b) => b.score - a.score)
}

export function resetConversationProviderHealth(): void {
  providerHealth.clear()
}
