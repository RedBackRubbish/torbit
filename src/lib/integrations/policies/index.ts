/**
 * TORBIT - Policy System
 * 
 * Organization Policies & Guardrails
 * "Policy as code for enterprise control"
 * 
 * Rules:
 * - Policies override user intent
 * - Policies override Planner plans
 * - Policies override auto-fix
 * - No exceptions. No hidden bypasses.
 */

// Types
export type {
  OrganizationPolicy,
  IntegrationPolicyRules,
  CategoryPolicyRules,
  AutoFixPolicy,
  ShippingPolicy,
  GovernancePolicy,
  VersionConstraint,
  PolicyViolation,
  PolicyViolationType,
  PolicyEvaluation,
} from './types'

export { DEFAULT_POLICY, STRICT_POLICY } from './types'

// Loader
export {
  getPolicy,
  getPolicySource,
  hasCustomPolicy,
  loadPolicyFromJson,
  setPolicy,
  resetToDefaultPolicy,
  validatePolicy,
  serializePolicy,
  generatePolicyTemplate,
  POLICY_FILENAME,
  POLICY_VERSION,
} from './loader'

// Evaluator
export {
  evaluatePolicy,
  isIntegrationAllowed,
  categoryRequiresApproval,
  isAutoFixEnabled,
  formatViolation,
  formatEvaluation,
  type EvaluationContext,
  type OperationType,
} from './evaluator'

// Enforcement
export {
  enforcePreInstall,
  enforcePreUpdate,
  enforcePreRemove,
  enforcePreAutoFix,
  enforcePreExport,
  enforcePreDeploy,
  withPolicyGate,
  wouldBeAllowed,
  previewViolations,
  PolicyViolationError,
  type EnforcementResult,
  type ExportContext,
  type PolicyLedgerEvent,
} from './enforcement'

// Ledger Integration
export {
  recordPolicyEvent,
  recordEnforcementResult,
  recordPolicyBlock,
  recordPolicyApproval,
  recordPolicyRejection,
  recordPolicyLoaded,
  recordPolicyUpdated,
  hasUnresolvedPolicyViolations,
  getPolicyEventSummary,
  type PolicyEventType,
} from './ledger-events'
