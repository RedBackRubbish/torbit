/**
 * TORBIT — Deterministic Agent Router
 *
 * Routes user requests to the correct agent using:
 *   1. Intent classification (chat | create | edit | debug | deploy)
 *   2. Governance kernel permissions (AGENT_ALLOWED_INTENTS)
 *   3. Domain keyword scoring (no LLM calls, no stochastic behavior)
 *
 * Every routing decision is logged as a machine-readable audit entry.
 * Ambiguous routes throw rather than silently defaulting.
 */

import type { AgentId } from '@/lib/tools/definitions'
import type { IntentKind } from '@/lib/intent/classifier'
import { classifyIntent, isActionIntent } from '@/lib/intent/classifier'
import { AGENT_ALLOWED_INTENTS, isReadOnlyAgent } from '@/lib/governance/kernel'

// ============================================
// TYPES
// ============================================

/**
 * The output of the deterministic routing algorithm.
 * Every field is derived from rules, never from an LLM.
 */
export interface RoutingDecision {
  /** Which agent should handle this task */
  targetAgent: AgentId
  /** The classified intent of the user's request */
  intent: IntentKind
  /** Preferred model tier based on intent and critical path */
  modelTier: 'opus' | 'sonnet' | 'flash'
  /** Whether the request touches auth/payment/security surfaces */
  isCriticalPath: boolean
  /** Deterministic explanation of why this agent was selected */
  reasoning: string
  /** Which domain keywords matched in the prompt */
  signals: string[]
}

/**
 * Machine-readable audit record for every routing decision.
 * Surfaced to the supervisor panel for traceability.
 */
export interface RoutingAuditEntry {
  /** ISO-8601 timestamp */
  timestamp: string
  /** User prompt, truncated to 200 characters */
  prompt: string
  /** Classified intent */
  intent: IntentKind
  /** Candidate agents that were eligible */
  candidates: AgentId[]
  /** The agent that was ultimately selected */
  selected: AgentId
  /** Domain keywords that influenced the decision */
  signals: string[]
  /** Whether a critical path upgrade was applied */
  isCriticalPath: boolean
  /** Final model tier */
  modelTier: 'opus' | 'sonnet' | 'flash'
}

/**
 * Error thrown when the router cannot unambiguously select an agent.
 * The orchestrator should surface this to the user for clarification.
 */
export class AmbiguousRoutingError extends Error {
  public readonly intent: IntentKind
  public readonly tiedAgents: AgentId[]

  constructor(intent: IntentKind, tiedAgents: AgentId[]) {
    super(
      `Cannot unambiguously route intent "${intent}". ` +
      `Tied agents: ${tiedAgents.join(', ')}. ` +
      `Add domain-specific keywords to disambiguate.`
    )
    this.name = 'AmbiguousRoutingError'
    this.intent = intent
    this.tiedAgents = tiedAgents
  }
}

// ============================================
// CRITICAL PATH DETECTION
// ============================================

/** Patterns that flag security-sensitive requests. */
export const CRITICAL_PATH_PATTERNS = [
  /\b(auth|authentication|login|signup|password|session|jwt|oauth)\b/i,
  /\b(payment|stripe|checkout|billing|subscription|credit.?card)\b/i,
  /\b(security|encrypt\w*|decrypt\w*|hash\w*|secret|api.?key|token)\b/i,
  /\b(admin|permission|role|rbac|acl|access.?control)\b/i,
  /\b(pii|gdpr|hipaa|compliance|audit.?log|vulnerabilit\w*)\b/i,
]

/** Check if a prompt touches a critical security path. */
export function isCriticalPath(prompt: string): boolean {
  return CRITICAL_PATH_PATTERNS.some(pattern => pattern.test(prompt))
}

// ============================================
// DOMAIN SIGNAL MAP
// ============================================

/**
 * Keyword patterns that associate a prompt with a specific agent's domain.
 * Each entry is a pair of [regex, weight]. Higher weight = stronger signal.
 */
const DOMAIN_SIGNALS: Record<AgentId, Array<[RegExp, number]>> = {
  frontend: [
    [/\bcomponents?\b/i, 2],
    [/\bpages?\b/i, 1],
    [/\b(ui|ux)\b/i, 2],
    [/\b(css|tailwind|style|styling)\b/i, 2],
    [/\blayout\b/i, 1],
    [/\bdesign\b/i, 1],
    [/\bresponsive\b/i, 1],
    [/\banimation\b/i, 1],
    [/\b(svelte|react|vue)\b/i, 2],
    [/\b(button|modal|sidebar|navbar|header|footer|card|form)\b/i, 2],
  ],
  backend: [
    [/\bapi\b/i, 2],
    [/\bendpoints?\b/i, 2],
    [/\broutes?\b/i, 1],
    [/\bservers?\b/i, 1],
    [/\b(auth|authentication)\b/i, 2],
    [/\bmiddleware\b/i, 2],
    [/\bwebhooks?\b/i, 2],
    [/\bcrons?\b/i, 1],
    [/\b(rest|graphql|trpc)\b/i, 2],
  ],
  database: [
    [/\bschemas?\b/i, 2],
    [/\bmigrations?\b/i, 2],
    [/\bsql\b/i, 2],
    [/\btables?\b/i, 2],
    [/\bquer(y|ies)\b/i, 2],
    [/\bseeds?\b/i, 1],
    [/\b(prisma|drizzle|supabase)\b/i, 2],
    [/\b(postgres|mongo|sqlite)\b/i, 2],
    [/\b(foreign.?key|index|constraint)\b/i, 1],
  ],
  devops: [
    [/\bdeploy(ment)?\b/i, 2],
    [/\bdocker\b/i, 2],
    [/\b(ci|cd|ci\/cd)\b/i, 2],
    [/\bgithub.?actions?\b/i, 2],
    [/\b(vercel|netlify|railway)\b/i, 2],
    [/\binfrastructure\b/i, 1],
    [/\b(kubernetes|k8s)\b/i, 2],
    [/\b(aws|gcp|azure)\b/i, 1],
  ],
  qa: [
    [/\btests?\b/i, 2],
    [/\bspecs?\b/i, 2],
    [/\be2e\b/i, 2],
    [/\bcoverage\b/i, 1],
    [/\b(playwright|vitest|jest)\b/i, 2],
    [/\bassertions?\b/i, 1],
    [/\bunit.?tests?\b/i, 2],
    [/\bintegration.?tests?\b/i, 2],
  ],
  architect: [
    [/\barchitects?\b/i, 2],
    [/\bdesign.?system\b/i, 2],
    [/\brefactor\b/i, 2],
    [/\brestructure\b/i, 2],
    [/\brewrite\b/i, 2],
    [/\bsystem.?design\b/i, 2],
    [/\b(monorepo|microservices?)\b/i, 2],
  ],
  planner: [
    [/\bplan(ning)?\b/i, 2],
    [/\bbreak.?down\b/i, 2],
    [/\bdecompose\b/i, 2],
    [/\bprioritize\b/i, 1],
    [/\broadmap\b/i, 2],
    [/\bstrategy\b/i, 1],
    [/\btask.?list\b/i, 1],
  ],
  strategist: [],
  auditor: [],
}

// ============================================
// AUDIT LOG
// ============================================

const auditLog: RoutingAuditEntry[] = []
const MAX_AUDIT_LOG = 200

function recordAuditEntry(entry: RoutingAuditEntry): void {
  auditLog.push(entry)
  if (auditLog.length > MAX_AUDIT_LOG) {
    auditLog.shift()
  }
}

/** Return a shallow copy of the routing audit log. */
export function getRoutingAuditLog(): readonly RoutingAuditEntry[] {
  return [...auditLog]
}

/** Reset the audit log. **Test-only.** */
export function _resetRoutingAuditLog(): void {
  auditLog.length = 0
}

// ============================================
// MODEL TIER SELECTION
// ============================================

/** Default model tier per intent kind. */
const INTENT_MODEL_TIER: Record<IntentKind, 'opus' | 'sonnet' | 'flash'> = {
  chat: 'flash',
  create: 'sonnet',
  edit: 'sonnet',
  debug: 'sonnet',
  deploy: 'sonnet',
}

// ============================================
// DEFAULT AGENT FALLBACKS
// ============================================

/**
 * When intent allows many agents and no domain signal matches,
 * these defaults prevent ambiguity for common intents.
 */
const INTENT_DEFAULT_AGENT: Partial<Record<IntentKind, AgentId>> = {
  create: 'architect',
  edit: 'architect',
  debug: 'architect',
  deploy: 'devops',
}

// ============================================
// ROUTING ALGORITHM
// ============================================

/**
 * Route a user prompt to the best-fit agent.
 *
 * Algorithm:
 *   1. Classify the intent (chat/create/edit/debug/deploy).
 *   2. Get all agents allowed for that intent from the governance kernel.
 *   3. For action intents, exclude read-only agents.
 *   4. Score each candidate by domain keyword match.
 *   5. Select the highest-scoring agent. On ties or zero matches,
 *      use the intent default or throw `AmbiguousRoutingError`.
 *   6. Apply critical-path model tier upgrade.
 *   7. Record a `RoutingAuditEntry`.
 *
 * @throws {AmbiguousRoutingError} when no agent can be selected
 */
export function routeRequest(
  prompt: string,
  context?: { intent?: IntentKind },
): RoutingDecision {
  const intent = context?.intent ?? classifyIntent(prompt)
  const normalized = prompt.toLowerCase()

  // Step 2: eligible agents for this intent
  const allCandidates = (Object.keys(AGENT_ALLOWED_INTENTS) as AgentId[])
    .filter(agent => AGENT_ALLOWED_INTENTS[agent].includes(intent))

  // Step 3: for action intents, exclude read-only agents
  const candidates = isActionIntent(intent)
    ? allCandidates.filter(agent => !isReadOnlyAgent(agent))
    : allCandidates

  if (candidates.length === 0) {
    throw new AmbiguousRoutingError(intent, allCandidates)
  }

  // Step 4: score each candidate by domain signals
  const scores = new Map<AgentId, number>()
  const matchedSignals: string[] = []

  for (const agent of candidates) {
    let score = 0
    for (const [pattern, weight] of DOMAIN_SIGNALS[agent]) {
      if (pattern.test(normalized)) {
        score += weight
        const keyword = normalized.match(pattern)?.[0]
        if (keyword && !matchedSignals.includes(keyword)) {
          matchedSignals.push(keyword)
        }
      }
    }
    scores.set(agent, score)
  }

  // Step 5: find the winner
  let maxScore = -1
  const topAgents: AgentId[] = []
  for (const [agent, score] of scores) {
    if (score > maxScore) {
      maxScore = score
      topAgents.length = 0
      topAgents.push(agent)
    } else if (score === maxScore) {
      topAgents.push(agent)
    }
  }

  let selected: AgentId

  if (topAgents.length === 1 && maxScore > 0) {
    // Clear winner
    selected = topAgents[0]
  } else if (maxScore === 0 && INTENT_DEFAULT_AGENT[intent]) {
    // No domain signals matched — use intent default
    selected = INTENT_DEFAULT_AGENT[intent]!
    matchedSignals.length = 0
  } else if (topAgents.length > 1 && maxScore > 0) {
    // Tie — check if there's an intent default among the tied agents
    const defaultAgent = INTENT_DEFAULT_AGENT[intent]
    if (defaultAgent && topAgents.includes(defaultAgent)) {
      selected = defaultAgent
    } else {
      throw new AmbiguousRoutingError(intent, topAgents)
    }
  } else {
    // Zero signals, no intent default
    throw new AmbiguousRoutingError(intent, candidates)
  }

  // Step 6: model tier + critical path
  const critical = isCriticalPath(prompt)
  let modelTier = INTENT_MODEL_TIER[intent]
  if (critical && modelTier === 'flash') {
    modelTier = 'sonnet'
  }

  const reasoning = buildReasoning(intent, selected, matchedSignals, critical)

  const decision: RoutingDecision = {
    targetAgent: selected,
    intent,
    modelTier,
    isCriticalPath: critical,
    reasoning,
    signals: matchedSignals,
  }

  // Step 7: audit
  recordAuditEntry({
    timestamp: new Date().toISOString(),
    prompt: prompt.length > 200 ? prompt.slice(0, 200) + '…' : prompt,
    intent,
    candidates,
    selected,
    signals: matchedSignals,
    isCriticalPath: critical,
    modelTier,
  })

  return decision
}

// ============================================
// HELPERS
// ============================================

function buildReasoning(
  intent: IntentKind,
  agent: AgentId,
  signals: string[],
  critical: boolean,
): string {
  const parts: string[] = [
    `Intent "${intent}" → agent "${agent}"`,
  ]
  if (signals.length > 0) {
    parts.push(`domain signals: [${signals.join(', ')}]`)
  } else {
    parts.push('via intent default (no domain signals)')
  }
  if (critical) {
    parts.push('critical path detected')
  }
  return parts.join('; ')
}
