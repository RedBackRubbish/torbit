/**
 * TORBIT — Governance Kernel
 *
 * Runtime permission layer that sits between the orchestrator and tool
 * execution.  Every tool invocation and intent classification passes
 * through this kernel before it is allowed to proceed.
 *
 * Design goals:
 *   1. Single source of truth for "who can do what".
 *   2. Fail-closed: if the kernel cannot prove an action is allowed,
 *      it is denied.
 *   3. Zero-dependency on external services — pure TypeScript, runs
 *      anywhere (Edge, Node, tests).
 *   4. Every denial is logged as a structured `GovernanceViolation` so
 *      the supervisor UI can surface attempted over-reach.
 */

import type { AgentId, ToolName } from '@/lib/tools/definitions'
import { AGENT_TOOLS } from '@/lib/tools/definitions'
import type { IntentKind } from '@/lib/intent/classifier'

// ============================================
// AGENT INTENT PERMISSIONS
// ============================================

/**
 * Which intents each agent is allowed to handle.
 *
 * The planner/architect see all intents because they orchestrate.
 * Execution agents (frontend, backend, …) act on a scoped subset.
 * Read-only agents (strategist, auditor) can chat or review but
 * never initiate mutating intents on their own.
 */
export const AGENT_ALLOWED_INTENTS: Record<AgentId, readonly IntentKind[]> = {
  architect: ['chat', 'create', 'edit', 'debug', 'deploy'],
  planner:   ['chat', 'create', 'edit', 'debug', 'deploy'],
  frontend:  ['chat', 'create', 'edit', 'debug'],
  backend:   ['chat', 'create', 'edit', 'debug'],
  database:  ['chat', 'create', 'edit', 'debug'],
  devops:    ['chat', 'create', 'edit', 'debug', 'deploy'],
  qa:        ['chat', 'debug'],
  strategist: ['chat'],
  auditor:    ['chat'],
} as const

// ============================================
// TOOL CLASSIFICATION
// ============================================

/**
 * Tools that mutate project state (files, packages, deployments).
 * Any agent in `READ_ONLY_AGENTS` must never be handed one of these.
 */
export const MUTATING_TOOLS: ReadonlySet<ToolName> = new Set([
  'createFile',
  'editFile',
  'deleteFile',
  'applyPatch',
  'runCommand',
  'runTests',
  'installPackage',
  'deployPreview',
  'deployToProduction',
  'syncToGithub',
  'generateDesignSystem',
  'rollbackToCheckpoint',
  'atomicRollback',
  'injectSecureEnv',
  'openTunnelUrl',
  'closeTunnel',
  'connectMcpServer',
  'invokeMcpTool',
  'runE2eCycle',
  'generateTest',
  'syncExternalTicket',
  'resolveConflict',
  'cacheContext',
  'suggestFix',
  'createCheckpoint',
  'manageTask',
  'delegateToAgent',
])

/**
 * Agents that must never call a mutating tool.
 * Strategist produces verdicts, Auditor produces judgments.
 */
export const READ_ONLY_AGENTS: ReadonlySet<AgentId> = new Set([
  'strategist',
  'auditor',
])

// ============================================
// VIOLATION TYPES
// ============================================

/**
 * Structured record of a governance violation.
 * Surfaced to the supervisor panel and optionally persisted
 * for audit trails.
 */
export interface GovernanceViolation {
  /** Which agent attempted the action */
  agent: AgentId
  /** What kind of violation occurred */
  kind: 'unauthorized_tool' | 'unauthorized_intent' | 'read_only_mutation'
  /** Human-readable description */
  message: string
  /** The tool or intent that was denied */
  target: string
  /** ISO-8601 timestamp of the violation */
  timestamp: string
  /** Partial tool arguments (never includes secret values) */
  metadata?: Record<string, unknown>
}

/**
 * Error thrown when a governance guard fails.
 * Callers should catch this at the orchestrator level and
 * surface it to the supervisor panel.
 */
export class GovernanceError extends Error {
  public readonly violation: GovernanceViolation

  constructor(violation: GovernanceViolation) {
    super(violation.message)
    this.name = 'GovernanceError'
    this.violation = violation
  }
}

// ============================================
// VIOLATION LOG
// ============================================

/**
 * In-memory violation log.  In production this should be drained to
 * a persistent store, but the in-memory buffer lets the supervisor
 * panel show recent violations without a round-trip.
 */
const violationLog: GovernanceViolation[] = []

/** Maximum violations kept in memory before oldest entries are dropped. */
const MAX_VIOLATION_LOG = 200

function recordViolation(v: GovernanceViolation): void {
  violationLog.push(v)
  if (violationLog.length > MAX_VIOLATION_LOG) {
    violationLog.shift()
  }
}

/**
 * Return a shallow copy of the in-memory violation log.
 * Most recent violations are at the end of the array.
 */
export function getViolationLog(): readonly GovernanceViolation[] {
  return [...violationLog]
}

// ============================================
// TOOL AUTHORIZATION
// ============================================

/** Result of a tool authorization check. */
export interface ToolAuthResult {
  /** Whether the agent is allowed to invoke this tool. */
  allowed: boolean
  /** Present only when `allowed` is false. */
  violation?: GovernanceViolation
}

/**
 * Determine whether `agent` is permitted to invoke `tool` with the
 * given `args`.
 *
 * Rules (evaluated in order):
 *   1. The tool must exist in `AGENT_TOOLS[agent]`.
 *   2. If the agent is read-only, the tool must not be mutating.
 *
 * When authorization fails a `GovernanceViolation` is recorded in
 * the in-memory log and returned in the result.
 *
 * @example
 * ```ts
 * const result = authorizeToolInvocation('auditor', 'createFile', { path: 'foo.ts' })
 * if (!result.allowed) {
 *   console.error(result.violation)
 * }
 * ```
 */
export function authorizeToolInvocation(
  agent: AgentId,
  tool: ToolName,
  args?: Record<string, unknown>,
): ToolAuthResult {
  const agentTools = AGENT_TOOLS[agent]

  // Rule 1: tool must be in the agent's allowlist
  if (!(tool in agentTools)) {
    const violation: GovernanceViolation = {
      agent,
      kind: 'unauthorized_tool',
      message: `Agent "${agent}" is not permitted to use tool "${tool}".`,
      target: tool,
      timestamp: new Date().toISOString(),
      metadata: sanitizeArgs(args),
    }
    recordViolation(violation)
    return { allowed: false, violation }
  }

  // Rule 2: read-only agents must not invoke mutating tools
  if (READ_ONLY_AGENTS.has(agent) && MUTATING_TOOLS.has(tool)) {
    const violation: GovernanceViolation = {
      agent,
      kind: 'read_only_mutation',
      message: `Read-only agent "${agent}" attempted mutating tool "${tool}".`,
      target: tool,
      timestamp: new Date().toISOString(),
      metadata: sanitizeArgs(args),
    }
    recordViolation(violation)
    return { allowed: false, violation }
  }

  return { allowed: true }
}

// ============================================
// INTENT AUTHORIZATION
// ============================================

/**
 * Assert that `agent` is allowed to handle `intent`.
 *
 * Throws a `GovernanceError` when the intent is not in the agent's
 * allowlist.  The violation is also recorded in the in-memory log.
 *
 * @example
 * ```ts
 * assertIntentAllowed('auditor', 'deploy')
 * // → throws GovernanceError: Agent "auditor" is not permitted to handle intent "deploy".
 * ```
 */
export function assertIntentAllowed(agent: AgentId, intent: IntentKind): void {
  const allowed = AGENT_ALLOWED_INTENTS[agent]

  if (!allowed.includes(intent)) {
    const violation: GovernanceViolation = {
      agent,
      kind: 'unauthorized_intent',
      message: `Agent "${agent}" is not permitted to handle intent "${intent}".`,
      target: intent,
      timestamp: new Date().toISOString(),
    }
    recordViolation(violation)
    throw new GovernanceError(violation)
  }
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * List the tool names available to a given agent.
 * Useful for prompt construction and UI tool-palette rendering.
 */
export function getAgentToolNames(agent: AgentId): ToolName[] {
  return Object.keys(AGENT_TOOLS[agent]) as ToolName[]
}

/**
 * Return true if `agent` is classified as read-only
 * (strategist, auditor).
 */
export function isReadOnlyAgent(agent: AgentId): boolean {
  return READ_ONLY_AGENTS.has(agent)
}

/**
 * Return true if `tool` is classified as a mutating operation.
 */
export function isMutatingTool(tool: ToolName): boolean {
  return MUTATING_TOOLS.has(tool)
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Strip potentially sensitive fields from tool arguments before
 * attaching them to a violation record.  We keep the structure
 * but redact any key whose name suggests it holds a secret.
 */
const SENSITIVE_KEYS = /token|secret|key|password|credential|auth/i

function sanitizeArgs(
  args: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!args) return undefined

  const sanitized: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (SENSITIVE_KEYS.test(k)) {
      sanitized[k] = '[REDACTED]'
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = sanitizeArgs(v as Record<string, unknown>)
    } else {
      sanitized[k] = v
    }
  }
  return sanitized
}

// ============================================
// TEST UTILITIES
// ============================================

/**
 * Reset the in-memory violation log.
 * **Test-only** — never call this in production code.
 */
export function _resetViolationLog(): void {
  violationLog.length = 0
}
