/**
 * GOVERNANCE OBJECT
 * 
 * Structured contract that travels through the agent pipeline.
 * Strategist emits it, Auditor enforces it.
 * 
 * This is INTERNAL - the user never sees this. The UI translates
 * governance intent into friendly summaries like:
 *   "I'll update the sidebar and keep your blue theme as-is."
 */

// ============================================
// TYPES
// ============================================

export interface ProtectedInvariant {
  /** What must remain true (e.g., "Blue theme on sidebar") */
  description: string
  /** Files or patterns this invariant applies to */
  scope: string[]
  /** How critical: 'hard' = must never break, 'soft' = warn if broken */
  severity: 'hard' | 'soft'
}

export interface GovernanceObject {
  verdict: 'approved' | 'approved_with_amendments' | 'rejected' | 'escalate'
  confidence: 'high' | 'medium' | 'low'
  /** What the build is allowed to change */
  scope: {
    intent: string
    affected_areas: string[]
  }
  /** Things that MUST NOT change */
  protected_invariants: ProtectedInvariant[]
  /** Required changes before proceeding (only for approved_with_amendments) */
  amendments?: string[]
  /** Why it was rejected (only for rejected) */
  rejection_reason?: string
  /** Why it needs human input (only for escalate) */
  escalation_reason?: string
  /** Free-form notes for downstream agents */
  notes?: string
}

/** Result of parsing Strategist output */
export interface GovernanceParseResult {
  success: boolean
  governance: GovernanceObject | null
  raw: string
  parseError?: string
}

// ============================================
// PARSER
// ============================================

/**
 * Extract GovernanceObject from Strategist's response.
 * Looks for a JSON block in the output. Falls back to
 * legacy prose parsing if no valid JSON is found.
 */
export function parseGovernanceOutput(raw: string): GovernanceParseResult {
  // 1. Try to extract JSON block (```json ... ``` or raw JSON object)
  const jsonBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  const rawJsonMatch = !jsonBlockMatch ? raw.match(/(\{[\s\S]*"verdict"[\s\S]*\})/) : null
  const jsonStr = jsonBlockMatch?.[1] || rawJsonMatch?.[1]

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr)
      const governance = validateGovernanceShape(parsed)
      if (governance) {
        return { success: true, governance, raw }
      }
    } catch {
      // JSON parse failed, fall through to legacy
    }
  }

  // 2. Legacy fallback: parse prose verdicts from old-format Strategist
  const legacyGovernance = parseLegacyVerdict(raw)
  if (legacyGovernance) {
    return { success: true, governance: legacyGovernance, raw }
  }

  return {
    success: false,
    governance: null,
    raw,
    parseError: 'Could not extract GovernanceObject from Strategist output',
  }
}

/**
 * Validate that a parsed object has the required GovernanceObject shape.
 * Fills in defaults for optional fields.
 */
function validateGovernanceShape(obj: Record<string, unknown>): GovernanceObject | null {
  const validVerdicts = ['approved', 'approved_with_amendments', 'rejected', 'escalate']
  const verdict = String(obj.verdict ?? '').toLowerCase()
  
  if (!validVerdicts.includes(verdict)) return null

  const scope = obj.scope as { intent?: string; affected_areas?: string[] } | undefined
  const invariants = Array.isArray(obj.protected_invariants) ? obj.protected_invariants : []

  return {
    verdict: verdict as GovernanceObject['verdict'],
    confidence: (['high', 'medium', 'low'].includes(String(obj.confidence)) 
      ? String(obj.confidence) 
      : 'medium') as GovernanceObject['confidence'],
    scope: {
      intent: String(scope?.intent ?? ''),
      affected_areas: Array.isArray(scope?.affected_areas) ? scope.affected_areas.map(String) : [],
    },
    protected_invariants: invariants.map((inv: Record<string, unknown>) => ({
      description: String(inv.description ?? ''),
      scope: Array.isArray(inv.scope) ? inv.scope.map(String) : [],
      severity: inv.severity === 'hard' ? 'hard' : 'soft',
    })),
    amendments: Array.isArray(obj.amendments) ? obj.amendments.map(String) : undefined,
    rejection_reason: obj.rejection_reason ? String(obj.rejection_reason) : undefined,
    escalation_reason: obj.escalation_reason ? String(obj.escalation_reason) : undefined,
    notes: obj.notes ? String(obj.notes) : undefined,
  }
}

/**
 * Parse legacy prose verdicts (VERDICT: APPROVED / REJECTED / etc.)
 * This ensures backward compatibility with old Strategist output.
 */
function parseLegacyVerdict(raw: string): GovernanceObject | null {
  const upper = raw.toUpperCase()

  let verdict: GovernanceObject['verdict']
  if (upper.includes('REJECTED')) {
    verdict = 'rejected'
  } else if (upper.includes('REQUIRES HUMAN') || upper.includes('ESCALATE')) {
    verdict = 'escalate'
  } else if (upper.includes('AMENDMENTS') || upper.includes('AMEND')) {
    verdict = 'approved_with_amendments'
  } else if (upper.includes('APPROVED')) {
    verdict = 'approved'
  } else {
    return null
  }

  // Extract reason if rejected
  const reasonMatch = raw.match(/REASON:\s*(.+?)(?:\n|$)/i)
  const rejection_reason = verdict === 'rejected' ? reasonMatch?.[1]?.trim() : undefined
  const escalation_reason = verdict === 'escalate' ? reasonMatch?.[1]?.trim() : undefined

  // Extract amendments
  const amendmentsMatch = raw.match(/AMENDMENTS?:\s*([\s\S]+?)(?:RATIONALE|$)/i)
  const amendments = amendmentsMatch
    ? amendmentsMatch[1].split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.trim())
    : undefined

  return {
    verdict,
    confidence: 'medium',
    scope: { intent: '', affected_areas: [] },
    protected_invariants: [],
    amendments: amendments && amendments.length > 0 ? amendments : undefined,
    rejection_reason,
    escalation_reason,
    notes: 'Parsed from legacy prose verdict format',
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Format governance object for injection into downstream agent prompts.
 * This is what gets appended to the Auditor's context.
 */
export function formatGovernanceForAgent(gov: GovernanceObject): string {
  const lines: string[] = [
    '=== GOVERNANCE CONTRACT (from Strategist) ===',
    `Intent: ${gov.scope.intent}`,
    `Affected areas: ${gov.scope.affected_areas.join(', ') || 'none specified'}`,
  ]

  if (gov.protected_invariants.length > 0) {
    lines.push('', 'PROTECTED INVARIANTS (must not break):')
    for (const inv of gov.protected_invariants) {
      const tag = inv.severity === 'hard' ? '[HARD]' : '[SOFT]'
      lines.push(`  ${tag} ${inv.description}`)
      if (inv.scope.length > 0) {
        lines.push(`        Scope: ${inv.scope.join(', ')}`)
      }
    }
  }

  if (gov.amendments && gov.amendments.length > 0) {
    lines.push('', 'REQUIRED AMENDMENTS:')
    for (const a of gov.amendments) {
      lines.push(`  - ${a}`)
    }
  }

  if (gov.notes) {
    lines.push('', `Notes: ${gov.notes}`)
  }

  lines.push('=== END GOVERNANCE CONTRACT ===')
  return lines.join('\n')
}

/**
 * Generate a user-friendly summary of what the governance object means.
 * This is what the UI can show to the user.
 */
export function summarizeForUser(gov: GovernanceObject): string {
  const parts: string[] = []

  if (gov.scope.intent) {
    parts.push(gov.scope.intent)
  }

  if (gov.protected_invariants.length > 0) {
    const kept = gov.protected_invariants.map(i => i.description).join(', ')
    parts.push(`Keeping intact: ${kept}`)
  }

  return parts.join('. ') + '.'
}
