/**
 * TORBIT - Evidence Bundle Types
 * 
 * Exportable compliance evidence for enterprise security teams.
 * "Everything you need is inside."
 * 
 * Properties:
 * - Read-only
 * - Deterministic
 * - No secrets
 * - Hashable
 */

import type { EnvironmentName, EnvironmentProfile } from '../environments/types'
import type { OrganizationPolicy } from '../policies/types'
import type { LedgerEntry } from '../ledger/types'
import type { HealthReport } from '../health/types'
import type { KnowledgeSnapshot } from '@/lib/knowledge/memory/types'

// ============================================
// EVIDENCE BUNDLE
// ============================================

export interface EvidenceBundle {
  /**
   * Bundle version for compatibility
   */
  version: '1.0.0'
  
  /**
   * Bundle generation timestamp (ISO 8601)
   */
  generatedAt: string
  
  /**
   * SHA-256 hash of bundle contents (excluding this field)
   */
  bundleHash: string

  /**
   * Signature over bundle hash (customer-verifiable trust proof)
   */
  signature?: SignedArtifactSignature
  
  /**
   * Export metadata
   */
  export: ExportMetadata
  
  /**
   * Human-readable attestation
   */
  attestation: AttestationFile
  
  /**
   * Audit report in markdown
   */
  auditReport: string
  
  /**
   * Full integration ledger
   */
  ledger: LedgerEntry[]
  
  /**
   * Policy snapshot at export time
   */
  policySnapshot: OrganizationPolicy
  
  /**
   * Environment profile at export time
   */
  environmentProfile: EnvironmentProfile
  
  /**
   * Health status at export time
   */
  healthStatus: HealthReport
  
  /**
   * Knowledge snapshot at export time (Directive I)
   */
  knowledgeSnapshot?: KnowledgeSnapshot
}

// ============================================
// EXPORT METADATA
// ============================================

export interface ExportMetadata {
  /**
   * Project name
   */
  projectName: string
  
  /**
   * Export target (ios, android, web, vercel, etc.)
   */
  target: string
  
  /**
   * Export timestamp
   */
  exportedAt: string
  
  /**
   * User who initiated export (if available)
   */
  exportedBy?: string
  
  /**
   * TORBIT version
   */
  torbitVersion: string
  
  /**
   * Build ID (unique per export)
   */
  buildId: string
}

// ============================================
// ATTESTATION FILE
// ============================================

export interface AttestationFile {
  /**
   * Human-readable attestation statement
   */
  statement: string
  
  /**
   * Structured attestation data
   */
  data: AttestationData
  
  /**
   * Generation timestamp
   */
  generatedAt: string
  
  /**
   * Hash of the attestation data
   */
  hash: string

  /**
   * Optional signature over attestation hash
   */
  signature?: SignedArtifactSignature
}

export interface SignedArtifactSignature {
  /**
   * Signature algorithm used for signing
   */
  algorithm: 'HMAC-SHA256'

  /**
   * Key identifier used for verification routing
   */
  keyId: string

  /**
   * Hex signature payload
   */
  value: string

  /**
   * ISO timestamp of signing operation
   */
  signedAt: string
}

export interface AttestationData {
  /**
   * Export date
   */
  exportDate: string
  
  /**
   * Active environment
   */
  environment: EnvironmentName
  
  /**
   * Policy name
   */
  policyName: string
  
  /**
   * Integration health status
   */
  integrationHealth: 'CLEAN' | 'WARNINGS' | 'ERRORS'
  
  /**
   * Drift status
   */
  driftStatus: 'NONE' | 'DETECTED'
  
  /**
   * Auditor status
   */
  auditorStatus: 'PASSED' | 'FAILED' | 'SKIPPED'
  
  /**
   * Strategist status
   */
  strategistStatus: 'PASSED' | 'FAILED' | 'SKIPPED'
  
  /**
   * Number of integrations
   */
  integrationCount: number
  
  /**
   * Number of ledger entries
   */
  ledgerEntryCount: number
  
  /**
   * Policy violations at export time
   */
  policyViolations: number
  
  /**
   * Environment violations at export time
   */
  environmentViolations: number
}

// ============================================
// COMPLIANCE MANIFEST
// ============================================

export interface ComplianceManifest {
  /**
   * Manifest version
   */
  version: '1.0.0'
  
  /**
   * Files included in the compliance folder
   */
  files: ComplianceFile[]
  
  /**
   * Generation timestamp
   */
  generatedAt: string
  
  /**
   * Total hash of all files
   */
  manifestHash: string

  /**
   * Optional signature for manifest tamper proof
   */
  signature?: SignedArtifactSignature
}

export interface ComplianceFile {
  /**
   * File path relative to /compliance/
   */
  path: string
  
  /**
   * File description
   */
  description: string
  
  /**
   * SHA-256 hash of file contents
   */
  hash: string
  
  /**
   * File size in bytes
   */
  size: number
}

// ============================================
// AUDIT REPORT SECTIONS
// ============================================

export interface AuditReportData {
  /**
   * Executive summary
   */
  summary: {
    exportDate: string
    environment: EnvironmentName
    policyName: string
    overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNINGS'
  }
  
  /**
   * Integration inventory
   */
  integrations: {
    id: string
    name: string
    category: string
    version: string
    status: 'HEALTHY' | 'DRIFT' | 'DEPRECATED'
  }[]
  
  /**
   * Policy compliance
   */
  policyCompliance: {
    rule: string
    status: 'PASS' | 'FAIL' | 'N/A'
    details?: string
  }[]
  
  /**
   * Environment compliance
   */
  environmentCompliance: {
    rule: string
    status: 'PASS' | 'FAIL' | 'N/A'
    details?: string
  }[]
  
  /**
   * Governance events
   */
  governanceEvents: {
    timestamp: string
    type: string
    description: string
  }[]
  
  /**
   * Recommendations
   */
  recommendations: string[]
}

// ============================================
// BUNDLE OPTIONS
// ============================================

export interface EvidenceBundleOptions {
  /**
   * Include full ledger (can be large)
   * @default true
   */
  includeLedger: boolean
  
  /**
   * Include health report
   * @default true
   */
  includeHealth: boolean
  
  /**
   * Include policy snapshot
   * @default true
   */
  includePolicy: boolean
  
  /**
   * Include environment profile
   * @default true
   */
  includeEnvironment: boolean
  
  /**
   * Redact any potentially sensitive data
   * @default true
   */
  redactSensitive: boolean

  /**
   * HMAC secret for signed bundle output
   * If omitted, bundle remains hash-only.
   */
  signingSecret?: string

  /**
   * Identifier for signature verification routing
   * @default torbit-default
   */
  signingKeyId?: string
}

export const DEFAULT_BUNDLE_OPTIONS: EvidenceBundleOptions = {
  includeLedger: true,
  includeHealth: true,
  includePolicy: true,
  includeEnvironment: true,
  redactSensitive: true,
  signingSecret: undefined,
  signingKeyId: 'torbit-default',
}
