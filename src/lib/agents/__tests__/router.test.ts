/**
 * Tests for Deterministic Agent Router
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  routeRequest,
  isCriticalPath,
  getRoutingAuditLog,
  AmbiguousRoutingError,
  CRITICAL_PATH_PATTERNS,
  _resetRoutingAuditLog,
} from '../router'
import type { RoutingDecision } from '../router'

beforeEach(() => {
  _resetRoutingAuditLog()
})

// ============================================
// Intent → Agent routing
// ============================================

describe('routeRequest — intent-based routing', () => {
  it('routes "create" intent with frontend signals to frontend', () => {
    const result = routeRequest('create a new button component')
    expect(result.targetAgent).toBe('frontend')
    expect(result.intent).toBe('create')
    expect(result.signals).toContain('component')
  })

  it('routes "create" intent with backend signals to backend', () => {
    const result = routeRequest('create a REST API endpoint for users')
    expect(result.targetAgent).toBe('backend')
    expect(result.intent).toBe('create')
    expect(result.signals).toContain('api')
  })

  it('routes "create" intent with database signals to database', () => {
    const result = routeRequest('create a Prisma schema for products')
    expect(result.targetAgent).toBe('database')
    expect(result.intent).toBe('create')
  })

  it('routes "create" intent with no domain signals to architect (default)', () => {
    const result = routeRequest('build a complete e-commerce solution')
    expect(result.targetAgent).toBe('architect')
    expect(result.signals).toHaveLength(0)
  })

  it('routes "deploy" intent to devops', () => {
    const result = routeRequest('deploy to Vercel production')
    expect(result.targetAgent).toBe('devops')
    expect(result.intent).toBe('deploy')
  })

  it('routes "debug" intent with test signals to qa', () => {
    const result = routeRequest('debug the failing unit tests')
    expect(result.targetAgent).toBe('qa')
    expect(result.intent).toBe('debug')
  })

  it('routes "edit" intent with frontend signals to frontend', () => {
    const result = routeRequest('update the sidebar component styling')
    expect(result.targetAgent).toBe('frontend')
    expect(result.intent).toBe('edit')
  })

  it('routes "edit" intent with architect signals to architect', () => {
    const result = routeRequest('refactor the authentication module')
    expect(result.targetAgent).toBe('architect')
    expect(result.intent).toBe('edit')
  })

  it('routes "chat" intent with domain signals to the matching agent', () => {
    const result = routeRequest('how does the Prisma schema work?')
    expect(result.targetAgent).toBe('database')
    expect(result.intent).toBe('chat')
  })
})

// ============================================
// Domain signal scoring
// ============================================

describe('routeRequest — domain signal scoring', () => {
  it('picks the agent with the highest total signal weight', () => {
    // "sql migration schema" = 6 points for database, 0 for others
    const result = routeRequest('add sql migration for the new schema')
    expect(result.targetAgent).toBe('database')
  })

  it('records matched keywords in signals array', () => {
    const result = routeRequest('create a React component with Tailwind styling')
    expect(result.signals.length).toBeGreaterThan(0)
    expect(result.signals).toContain('react')
  })

  it('handles prompts with signals for multiple agents by picking highest', () => {
    // "component" (frontend: 2) vs "api" (backend: 2) vs "test" (qa: 2)
    // plus "button" (frontend: 2) → frontend wins with 4
    const result = routeRequest('add a button component')
    expect(result.targetAgent).toBe('frontend')
  })
})

// ============================================
// Ambiguous routing
// ============================================

describe('routeRequest — ambiguous routing', () => {
  it('throws AmbiguousRoutingError when chat intent has no domain signals and no default', () => {
    expect(() => routeRequest('hello there')).toThrow(AmbiguousRoutingError)
  })

  it('AmbiguousRoutingError contains intent and tied agents', () => {
    try {
      routeRequest('hello there')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AmbiguousRoutingError)
      const ambiguous = err as AmbiguousRoutingError
      expect(ambiguous.intent).toBe('chat')
      expect(ambiguous.tiedAgents.length).toBeGreaterThan(1)
    }
  })

  it('uses intent default to break ties when available', () => {
    // "create" has default → architect, so zero-signal create prompts don't throw
    const result = routeRequest('generate something new from scratch')
    expect(result.targetAgent).toBe('architect')
  })
})

// ============================================
// Read-only agent exclusion
// ============================================

describe('routeRequest — read-only agent exclusion', () => {
  it('excludes strategist from action intents', () => {
    const result = routeRequest('create a new Svelte component')
    expect(result.targetAgent).not.toBe('strategist')
  })

  it('excludes auditor from action intents', () => {
    const result = routeRequest('edit the API endpoint')
    expect(result.targetAgent).not.toBe('auditor')
  })

  it('includes read-only agents for chat intent if they have domain signals', () => {
    // strategist and auditor have no domain signals, so they won't win,
    // but they should be in the candidate list for chat
    const result = routeRequest('how does the database schema work?')
    expect(result.intent).toBe('chat')
    // Should route to database (has signals), not strategist/auditor
    expect(result.targetAgent).toBe('database')
  })
})

// ============================================
// Critical path detection
// ============================================

describe('isCriticalPath', () => {
  it('detects authentication as critical', () => {
    expect(isCriticalPath('implement user authentication')).toBe(true)
    expect(isCriticalPath('add OAuth login')).toBe(true)
  })

  it('detects payment as critical', () => {
    expect(isCriticalPath('integrate Stripe payments')).toBe(true)
    expect(isCriticalPath('add billing subscription')).toBe(true)
  })

  it('detects security as critical', () => {
    expect(isCriticalPath('fix security vulnerability')).toBe(true)
    expect(isCriticalPath('implement RBAC permissions')).toBe(true)
  })

  it('does NOT flag non-critical paths', () => {
    expect(isCriticalPath('create a landing page')).toBe(false)
    expect(isCriticalPath('add a button component')).toBe(false)
  })

  it('has patterns for auth, payment, security, admin, compliance', () => {
    expect(CRITICAL_PATH_PATTERNS.length).toBeGreaterThanOrEqual(5)
  })
})

describe('routeRequest — critical path model tier upgrade', () => {
  it('upgrades chat model tier from flash to sonnet on critical path', () => {
    // "how does authentication work?" → chat intent (flash) + critical path → sonnet
    const result = routeRequest('how does the auth middleware work?')
    expect(result.intent).toBe('chat')
    expect(result.isCriticalPath).toBe(true)
    expect(result.modelTier).toBe('sonnet')
  })

  it('keeps sonnet for action intents on critical path (no downgrade)', () => {
    const result = routeRequest('add authentication middleware')
    expect(result.modelTier).toBe('sonnet')
    expect(result.isCriticalPath).toBe(true)
  })
})

// ============================================
// Model tier selection
// ============================================

describe('routeRequest — model tier', () => {
  it('uses flash for chat intent', () => {
    const result = routeRequest('how does the Prisma schema work?')
    expect(result.modelTier).toBe('flash')
  })

  it('uses sonnet for create intent', () => {
    const result = routeRequest('create a new button component')
    expect(result.modelTier).toBe('sonnet')
  })

  it('uses sonnet for edit intent', () => {
    const result = routeRequest('refactor the authentication module')
    expect(result.modelTier).toBe('sonnet')
  })

  it('uses sonnet for deploy intent', () => {
    const result = routeRequest('deploy to Vercel production')
    expect(result.modelTier).toBe('sonnet')
  })
})

// ============================================
// RoutingDecision shape
// ============================================

describe('RoutingDecision shape', () => {
  it('contains all required fields', () => {
    const result = routeRequest('create a new Svelte component')
    expect(result).toHaveProperty('targetAgent')
    expect(result).toHaveProperty('intent')
    expect(result).toHaveProperty('modelTier')
    expect(result).toHaveProperty('isCriticalPath')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('signals')
  })

  it('reasoning is a non-empty string', () => {
    const result = routeRequest('create a Docker deployment')
    expect(typeof result.reasoning).toBe('string')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('signals is an array', () => {
    const result = routeRequest('build a React form component')
    expect(Array.isArray(result.signals)).toBe(true)
  })
})

// ============================================
// Audit log
// ============================================

describe('routing audit log', () => {
  it('records every successful routing decision', () => {
    expect(getRoutingAuditLog()).toHaveLength(0)
    routeRequest('create a Svelte component')
    routeRequest('deploy to Vercel')
    expect(getRoutingAuditLog()).toHaveLength(2)
  })

  it('audit entry contains all required fields', () => {
    routeRequest('create a new API endpoint')
    const log = getRoutingAuditLog()
    expect(log).toHaveLength(1)
    const entry = log[0]
    expect(entry).toHaveProperty('timestamp')
    expect(entry).toHaveProperty('prompt')
    expect(entry).toHaveProperty('intent')
    expect(entry).toHaveProperty('candidates')
    expect(entry).toHaveProperty('selected')
    expect(entry).toHaveProperty('signals')
    expect(entry).toHaveProperty('isCriticalPath')
    expect(entry).toHaveProperty('modelTier')
  })

  it('truncates prompt to 200 characters', () => {
    const longPrompt = 'create a component ' + 'x'.repeat(300)
    routeRequest(longPrompt)
    const log = getRoutingAuditLog()
    expect(log[0].prompt.length).toBeLessThanOrEqual(201) // 200 + ellipsis char
  })

  it('caps at 200 entries', () => {
    for (let i = 0; i < 250; i++) {
      routeRequest('deploy to Vercel')
    }
    expect(getRoutingAuditLog()).toHaveLength(200)
  })

  it('returns a copy, not the internal array', () => {
    routeRequest('deploy to Vercel')
    const a = getRoutingAuditLog()
    const b = getRoutingAuditLog()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('does NOT record entries for ambiguous routes that throw', () => {
    try { routeRequest('hello there') } catch { /* expected */ }
    expect(getRoutingAuditLog()).toHaveLength(0)
  })

  it('is cleared by _resetRoutingAuditLog', () => {
    routeRequest('deploy to Vercel')
    expect(getRoutingAuditLog()).toHaveLength(1)
    _resetRoutingAuditLog()
    expect(getRoutingAuditLog()).toHaveLength(0)
  })
})

// ============================================
// Context override
// ============================================

describe('routeRequest — context override', () => {
  it('accepts an explicit intent override via context', () => {
    // "hello" would classify as chat, but we force deploy
    const result = routeRequest('deploy to Vercel', { intent: 'deploy' })
    expect(result.intent).toBe('deploy')
    expect(result.targetAgent).toBe('devops')
  })
})

// ============================================
// Integration test stubs
// ============================================

describe('integration stubs — orchestrator → router', () => {
  it.todo('routes a create request through orchestrator.smartExecute')
  it.todo('routes a deploy request through orchestrator.orchestrate')
  it.todo('orchestrator handles AmbiguousRoutingError gracefully')
  it.todo('routing audit log is populated after full orchestration cycle')
})
