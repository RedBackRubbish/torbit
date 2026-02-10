import { beforeEach, describe, expect, it } from 'vitest'
import {
  getConversationProviderHealthSnapshot,
  rankConversationProviders,
  recordConversationProviderFailure,
  recordConversationProviderSuccess,
  resetConversationProviderHealth,
} from './chat-health'

describe('chat provider health', () => {
  beforeEach(() => {
    resetConversationProviderHealth()
  })

  it('ranks healthy providers above failing providers', () => {
    recordConversationProviderSuccess('openai:gpt-5.2', {
      latencyMs: 420,
      now: 1000,
    })
    recordConversationProviderFailure('google:gemini-2.5-pro', {
      errorMessage: 'timeout',
      now: 1100,
    })

    const ranking = rankConversationProviders([
      'openai:gpt-5.2',
      'google:gemini-2.5-pro',
    ], 1200)

    expect(ranking.active[0].label).toBe('openai:gpt-5.2')
  })

  it('opens circuit after repeated failures and skips provider', () => {
    recordConversationProviderFailure('anthropic:claude-sonnet-4-5', {
      errorMessage: '503',
      now: 1000,
    })
    recordConversationProviderFailure('anthropic:claude-sonnet-4-5', {
      errorMessage: 'timeout',
      now: 1100,
    })

    const ranking = rankConversationProviders(['anthropic:claude-sonnet-4-5'], 1200)
    expect(ranking.active).toHaveLength(0)
    expect(ranking.skipped).toHaveLength(1)
    expect(ranking.skipped[0].circuitOpen).toBe(true)
    expect(ranking.skipped[0].cooldownMsRemaining).toBeGreaterThan(0)
  })

  it('closes circuit after a successful call', () => {
    recordConversationProviderFailure('google:gemini-2.5-pro', {
      errorMessage: '503',
      now: 1000,
    })
    recordConversationProviderFailure('google:gemini-2.5-pro', {
      errorMessage: 'timeout',
      now: 1100,
    })

    // Once cooldown window is over, a successful response should restore the provider.
    recordConversationProviderSuccess('google:gemini-2.5-pro', {
      latencyMs: 380,
      now: 40_000,
    })

    const snapshot = getConversationProviderHealthSnapshot(40_100)
    expect(snapshot[0].label).toBe('google:gemini-2.5-pro')
    expect(snapshot[0].circuitOpen).toBe(false)
    expect(snapshot[0].consecutiveFailures).toBe(0)
  })
})
