/**
 * GOVERNANCE UI COMPONENTS
 * 
 * UX PRINCIPLES (LOCKED):
 * - User talks to Torbit. Torbit is accountable.
 * - Agents are invisible infrastructure unless escalation required.
 * - Single voice, visible governance, invisible machinery.
 * 
 * WHAT MUST NEVER APPEAR:
 * ❌ Multiple chat bubbles from different agents
 * ❌ "Agent X says…"
 * ❌ Live debates
 * ❌ Streaming internal reasoning
 * ❌ Model names in normal UI
 * ❌ Users choosing which agent to talk to
 */

export { 
  SupervisorReviewPanel,
  type SupervisorVerdict,
  type SupervisorFindings,
  type SupervisorAmendment,
  type VerdictStatus,
} from './SupervisorReviewPanel'

export { 
  QualityGateResult,
  QualityGateSuccess,
  GovernanceResolved,
  type QualityGateVerdict,
  type QualityIssue,
} from './QualityGateResult'

export { 
  InspectorView,
  type ActivityEntry,
  type ActivityType,
} from './InspectorView'

export { 
  ExecutionStatus,
  InlineStatus,
  type ExecutionStage,
} from './ExecutionStatus'

export { 
  EscalationMessage,
  EscalationResolved,
} from './EscalationMessage'
