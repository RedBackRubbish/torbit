import { describe, expect, it, beforeEach } from 'vitest'
import { AGENT_TOOLS } from '@/lib/tools/definitions'
import type { AgentId, ToolName } from '@/lib/tools/definitions'
import type { IntentKind } from '@/lib/intent/classifier'
import {
  authorizeToolInvocation,
  assertIntentAllowed,
  getViolationLog,
  getAgentToolNames,
  isReadOnlyAgent,
  isMutatingTool,
  GovernanceError,
  AGENT_ALLOWED_INTENTS,
  MUTATING_TOOLS,
  READ_ONLY_AGENTS,
  _resetViolationLog,
} from './kernel'

beforeEach(() => {
  _resetViolationLog()
})

// ============================================
// authorizeToolInvocation
// ============================================

describe('authorizeToolInvocation', () => {
  it('allows a tool that is in the agent allowlist', () => {
    const result = authorizeToolInvocation('frontend', 'createFile', { path: 'src/App.svelte' })
    expect(result.allowed).toBe(true)
    expect(result.violation).toBeUndefined()
  })

  it('denies a tool that is NOT in the agent allowlist', () => {
    // frontend does not have deployToProduction
    const result = authorizeToolInvocation('frontend', 'deployToProduction', {})
    expect(result.allowed).toBe(false)
    expect(result.violation).toBeDefined()
    expect(result.violation!.kind).toBe('unauthorized_tool')
    expect(result.violation!.agent).toBe('frontend')
    expect(result.violation!.target).toBe('deployToProduction')
  })

  it('denies read-only agents from using mutating tools', () => {
    const result = authorizeToolInvocation('auditor', 'createFile', { path: 'hack.ts' })
    expect(result.allowed).toBe(false)
    expect(result.violation!.kind).toBe('unauthorized_tool')
  })

  it('allows read-only agents to use read-only tools', () => {
    const result = authorizeToolInvocation('strategist', 'readFile', { path: 'package.json' })
    expect(result.allowed).toBe(true)
  })

  it('allows read-only agents to use think', () => {
    const result = authorizeToolInvocation('auditor', 'think', { thought: 'hmm' })
    expect(result.allowed).toBe(true)
  })

  it('records violations in the in-memory log', () => {
    expect(getViolationLog()).toHaveLength(0)

    authorizeToolInvocation('auditor', 'runCommand', { command: 'rm -rf /' })

    const log = getViolationLog()
    expect(log).toHaveLength(1)
    expect(log[0].agent).toBe('auditor')
    expect(log[0].target).toBe('runCommand')
  })

  it('does NOT record violations for allowed tool calls', () => {
    authorizeToolInvocation('backend', 'readFile', { path: 'index.ts' })
    expect(getViolationLog()).toHaveLength(0)
  })

  it('redacts sensitive fields in violation metadata', () => {
    authorizeToolInvocation('auditor', 'deployToProduction', {
      provider: 'vercel',
      apiToken: 'secret-123',
      config: { secretKey: 'abc', region: 'us-east-1' },
    })

    const log = getViolationLog()
    expect(log).toHaveLength(1)
    const meta = log[0].metadata as Record<string, unknown>
    expect(meta.provider).toBe('vercel')
    // Top-level sensitive key
    expect(meta.apiToken).toBe('[REDACTED]')
    // Nested sensitive key inside a plain object
    const config = meta.config as Record<string, unknown>
    expect(config.secretKey).toBe('[REDACTED]')
    expect(config.region).toBe('us-east-1')
  })

  it('handles undefined args gracefully', () => {
    const result = authorizeToolInvocation('auditor', 'deleteFile')
    expect(result.allowed).toBe(false)
    expect(result.violation!.metadata).toBeUndefined()
  })

  it('includes an ISO timestamp on violations', () => {
    authorizeToolInvocation('strategist', 'runCommand', { command: 'echo hi' })
    const log = getViolationLog()
    expect(log[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ============================================
// assertIntentAllowed
// ============================================

describe('assertIntentAllowed', () => {
  it('does not throw for allowed intents', () => {
    expect(() => assertIntentAllowed('architect', 'create')).not.toThrow()
    expect(() => assertIntentAllowed('frontend', 'edit')).not.toThrow()
    expect(() => assertIntentAllowed('devops', 'deploy')).not.toThrow()
    expect(() => assertIntentAllowed('strategist', 'chat')).not.toThrow()
  })

  it('throws GovernanceError for unauthorized intents', () => {
    expect(() => assertIntentAllowed('auditor', 'deploy')).toThrow(GovernanceError)
    expect(() => assertIntentAllowed('strategist', 'create')).toThrow(GovernanceError)
    expect(() => assertIntentAllowed('qa', 'deploy')).toThrow(GovernanceError)
  })

  it('violation contains the correct agent and target', () => {
    try {
      assertIntentAllowed('auditor', 'edit')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(GovernanceError)
      const violation = (err as GovernanceError).violation
      expect(violation.agent).toBe('auditor')
      expect(violation.target).toBe('edit')
      expect(violation.kind).toBe('unauthorized_intent')
    }
  })

  it('records intent violations in the log', () => {
    try { assertIntentAllowed('strategist', 'deploy') } catch { /* expected */ }
    const log = getViolationLog()
    expect(log).toHaveLength(1)
    expect(log[0].kind).toBe('unauthorized_intent')
  })

  it('allows every agent to chat', () => {
    const agents: AgentId[] = [
      'architect', 'frontend', 'backend', 'database',
      'devops', 'qa', 'planner', 'strategist', 'auditor',
    ]
    for (const agent of agents) {
      expect(() => assertIntentAllowed(agent, 'chat')).not.toThrow()
    }
  })
})

// ============================================
// READ_ONLY_AGENTS & MUTATING_TOOLS consistency
// ============================================

describe('read-only agent invariants', () => {
  it('strategist has zero mutating tools in its allowlist', () => {
    const strategistTools = Object.keys(AGENT_TOOLS.strategist) as ToolName[]
    const mutating = strategistTools.filter(t => MUTATING_TOOLS.has(t))
    expect(mutating).toEqual([])
  })

  it('auditor has zero mutating tools in its allowlist', () => {
    const auditorTools = Object.keys(AGENT_TOOLS.auditor) as ToolName[]
    const mutating = auditorTools.filter(t => MUTATING_TOOLS.has(t))
    expect(mutating).toEqual([])
  })

  it('non-read-only agents have at least one mutating tool', () => {
    const agents: AgentId[] = [
      'architect', 'frontend', 'backend', 'database', 'devops', 'qa', 'planner',
    ]
    for (const agent of agents) {
      const tools = Object.keys(AGENT_TOOLS[agent]) as ToolName[]
      const mutating = tools.filter(t => MUTATING_TOOLS.has(t))
      expect(mutating.length).toBeGreaterThan(0)
    }
  })
})

// ============================================
// AGENT_ALLOWED_INTENTS completeness
// ============================================

describe('AGENT_ALLOWED_INTENTS', () => {
  it('covers every agent ID', () => {
    const agentIds = Object.keys(AGENT_TOOLS) as AgentId[]
    for (const id of agentIds) {
      expect(AGENT_ALLOWED_INTENTS[id]).toBeDefined()
      expect(AGENT_ALLOWED_INTENTS[id].length).toBeGreaterThan(0)
    }
  })

  it('only references valid IntentKind values', () => {
    const validIntents: IntentKind[] = ['chat', 'create', 'edit', 'debug', 'deploy']
    for (const intents of Object.values(AGENT_ALLOWED_INTENTS)) {
      for (const intent of intents) {
        expect(validIntents).toContain(intent)
      }
    }
  })
})

// ============================================
// Query helpers
// ============================================

describe('getAgentToolNames', () => {
  it('returns correct tool list for an agent', () => {
    const tools = getAgentToolNames('strategist')
    expect(tools).toContain('think')
    expect(tools).toContain('readFile')
    expect(tools).not.toContain('createFile')
    expect(tools).not.toContain('runCommand')
  })

  it('returns every key from AGENT_TOOLS for that agent', () => {
    const agents: AgentId[] = Object.keys(AGENT_TOOLS) as AgentId[]
    for (const agent of agents) {
      const fromHelper = getAgentToolNames(agent)
      const fromSource = Object.keys(AGENT_TOOLS[agent])
      expect(fromHelper.sort()).toEqual(fromSource.sort())
    }
  })
})

describe('isReadOnlyAgent', () => {
  it('returns true for strategist and auditor', () => {
    expect(isReadOnlyAgent('strategist')).toBe(true)
    expect(isReadOnlyAgent('auditor')).toBe(true)
  })

  it('returns false for execution agents', () => {
    expect(isReadOnlyAgent('frontend')).toBe(false)
    expect(isReadOnlyAgent('backend')).toBe(false)
    expect(isReadOnlyAgent('planner')).toBe(false)
  })
})

describe('isMutatingTool', () => {
  it('classifies write tools as mutating', () => {
    expect(isMutatingTool('createFile')).toBe(true)
    expect(isMutatingTool('editFile')).toBe(true)
    expect(isMutatingTool('deleteFile')).toBe(true)
    expect(isMutatingTool('runCommand')).toBe(true)
    expect(isMutatingTool('deployToProduction')).toBe(true)
  })

  it('classifies read tools as non-mutating', () => {
    expect(isMutatingTool('readFile')).toBe(false)
    expect(isMutatingTool('think')).toBe(false)
    expect(isMutatingTool('searchCode')).toBe(false)
    expect(isMutatingTool('getFileTree')).toBe(false)
    expect(isMutatingTool('listFiles')).toBe(false)
  })
})

// ============================================
// Violation log limits
// ============================================

describe('violation log', () => {
  it('caps at 200 entries', () => {
    for (let i = 0; i < 250; i++) {
      authorizeToolInvocation('auditor', 'runCommand', { i })
    }
    expect(getViolationLog()).toHaveLength(200)
  })

  it('returns a copy, not the internal array', () => {
    authorizeToolInvocation('auditor', 'deleteFile')
    const log1 = getViolationLog()
    const log2 = getViolationLog()
    expect(log1).not.toBe(log2)
    expect(log1).toEqual(log2)
  })

  it('is cleared by _resetViolationLog', () => {
    authorizeToolInvocation('auditor', 'runCommand', {})
    expect(getViolationLog()).toHaveLength(1)
    _resetViolationLog()
    expect(getViolationLog()).toHaveLength(0)
  })
})

// ============================================
// GovernanceError shape
// ============================================

describe('GovernanceError', () => {
  it('extends Error with name "GovernanceError"', () => {
    try {
      assertIntentAllowed('auditor', 'deploy')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(GovernanceError)
      expect((err as GovernanceError).name).toBe('GovernanceError')
    }
  })

  it('carries the violation on the error object', () => {
    try {
      assertIntentAllowed('strategist', 'edit')
    } catch (err) {
      const ge = err as GovernanceError
      expect(ge.violation.agent).toBe('strategist')
      expect(ge.violation.kind).toBe('unauthorized_intent')
    }
  })
})
