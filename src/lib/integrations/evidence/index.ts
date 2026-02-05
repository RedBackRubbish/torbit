/**
 * TORBIT - Evidence System
 * 
 * Exportable compliance evidence for enterprise security teams.
 * "Everything you need is inside."
 * 
 * Bundle contents:
 * - AUDIT_REPORT.md - Human-readable compliance report
 * - ATTESTATION.txt - Signed attestation statement
 * - INTEGRATIONS_LEDGER.json - Complete action history
 * - POLICY_SNAPSHOT.json - Policy at export time
 * - ENVIRONMENT_PROFILE.json - Environment at export time
 * - HEALTH_STATUS.json - Health status at export time
 * - MANIFEST.json - File inventory with hashes
 */

// Types
export type {
  EvidenceBundle,
  ExportMetadata,
  AttestationFile,
  AttestationData,
  ComplianceManifest,
  ComplianceFile,
  AuditReportData,
  EvidenceBundleOptions,
} from './types'

export { DEFAULT_BUNDLE_OPTIONS } from './types'

// Attestation
export {
  generateAttestation,
  generateQuickAttestation,
  serializeAttestation,
} from './attestation'

// Report
export {
  generateAuditReport,
  buildAuditReportData,
} from './report'

// Generator
export {
  generateEvidenceBundle,
  generateComplianceFiles,
  generateQuickBundle,
  type BundleGeneratorInput,
} from './generator'
