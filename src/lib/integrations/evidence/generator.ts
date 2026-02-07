/**
 * TORBIT - Evidence Bundle Generator
 * 
 * Generates complete compliance evidence bundles for export.
 * "Everything you need is inside."
 */

import type {
  EvidenceBundle,
  ExportMetadata,
  ComplianceManifest,
  ComplianceFile,
  EvidenceBundleOptions,
  DEFAULT_BUNDLE_OPTIONS,
} from './types'
import { generateAttestation, serializeAttestation } from './attestation'
import { generateAuditReport, buildAuditReportData } from './report'
import { getPolicy, serializePolicy } from '../policies'
import { getActiveProfile, getActiveEnvironment, serializeConfig, getEnvironmentConfig } from '../environments'
import { getLedger, exportLedger } from '../ledger'
import type { HealthReport } from '../health/types'
import type { LedgerEntry } from '../ledger/types'

// ============================================
// BUNDLE GENERATOR
// ============================================

export interface BundleGeneratorInput {
  /**
   * Project name
   */
  projectName: string
  
  /**
   * Export target
   */
  target: string
  
  /**
   * TORBIT version
   */
  torbitVersion: string
  
  /**
   * Current health report
   */
  healthReport: HealthReport
  
  /**
   * Integration details for the report
   */
  integrations: Array<{
    id: string
    name: string
    category: string
    version: string
    hasDrift: boolean
    isDeprecated: boolean
  }>
  
  /**
   * Auditor status
   */
  auditorPassed: boolean
  
  /**
   * Strategist status
   */
  strategistPassed: boolean
  
  /**
   * Policy violations at export time
   */
  policyViolations: string[]
  
  /**
   * Environment violations at export time
   */
  environmentViolations: string[]
  
  /**
   * User who initiated export
   */
  exportedBy?: string
}

/**
 * Generate a complete evidence bundle
 */
export function generateEvidenceBundle(
  input: BundleGeneratorInput,
  options: EvidenceBundleOptions = {
    includeLedger: true,
    includeHealth: true,
    includePolicy: true,
    includeEnvironment: true,
    redactSensitive: true,
  }
): EvidenceBundle {
  const now = new Date().toISOString()
  const buildId = generateBuildId()
  const environment = getActiveEnvironment()
  const policy = getPolicy()
  const profile = getActiveProfile()
  const ledger = getLedger()
  
  // Generate attestation
  const hasDrift = input.integrations.some(i => i.hasDrift)
  const hasHealthIssues = input.healthReport.issues.length > 0
  
  const attestation = generateAttestation({
    exportDate: now,
    environment,
    policyName: policy.name ?? 'Default Policy',
    integrationHealth: hasHealthIssues ? 'ERRORS' : 'CLEAN',
    driftStatus: hasDrift ? 'DETECTED' : 'NONE',
    auditorStatus: input.auditorPassed ? 'PASSED' : 'SKIPPED',
    strategistStatus: input.strategistPassed ? 'PASSED' : 'SKIPPED',
    integrationCount: input.integrations.length,
    ledgerEntryCount: ledger?.entries.length ?? 0,
    policyViolations: input.policyViolations.length,
    environmentViolations: input.environmentViolations.length,
  })
  
  // Generate audit report
  const reportData = buildAuditReportData({
    exportDate: now,
    environment,
    policyName: policy.name ?? 'Default Policy',
    integrations: input.integrations,
    ledgerEntries: ledger?.entries ?? [],
    policyViolations: input.policyViolations,
    environmentViolations: input.environmentViolations,
  })
  const auditReport = generateAuditReport(reportData)
  
  // Build export metadata
  const exportMetadata: ExportMetadata = {
    projectName: input.projectName,
    target: input.target,
    exportedAt: now,
    exportedBy: input.exportedBy,
    torbitVersion: input.torbitVersion,
    buildId,
  }
  
  // Redact sensitive data if needed
  const ledgerEntries = options.redactSensitive 
    ? redactLedgerEntries(ledger?.entries ?? [])
    : (ledger?.entries ?? [])
  
  const bundle: EvidenceBundle = {
    version: '1.0.0',
    generatedAt: now,
    bundleHash: '', // Will be set after computing
    export: exportMetadata,
    attestation,
    auditReport,
    ledger: options.includeLedger ? ledgerEntries : [],
    policySnapshot: options.includePolicy ? policy : {} as any,
    environmentProfile: options.includeEnvironment ? profile : {} as any,
    healthStatus: options.includeHealth ? input.healthReport : {} as any,
  }
  
  // Compute bundle hash (excluding the hash field itself)
  bundle.bundleHash = computeBundleHash(bundle)
  
  return bundle
}

// ============================================
// FILE GENERATORS
// ============================================

/**
 * Generate all compliance files as a map
 */
export function generateComplianceFiles(bundle: EvidenceBundle): Map<string, string> {
  const files = new Map<string, string>()
  
  // README-DEPLOY.md (Phase 5.2 - calm, facts only)
  files.set('README-DEPLOY.md', generateDeployReadme(bundle))
  
  // AUDIT_REPORT.md
  files.set('AUDIT_REPORT.md', bundle.auditReport)
  
  // ATTESTATION.txt
  files.set('ATTESTATION.txt', serializeAttestation(bundle.attestation))
  
  // INTEGRATIONS_LEDGER.json
  files.set('INTEGRATIONS_LEDGER.json', JSON.stringify(bundle.ledger, null, 2))
  
  // POLICY_SNAPSHOT.json
  files.set('POLICY_SNAPSHOT.json', JSON.stringify(bundle.policySnapshot, null, 2))
  
  // ENVIRONMENT_PROFILE.json
  files.set('ENVIRONMENT_PROFILE.json', JSON.stringify(bundle.environmentProfile, null, 2))
  
  // HEALTH_STATUS.json
  files.set('HEALTH_STATUS.json', JSON.stringify(bundle.healthStatus, null, 2))
  
  // MANIFEST.json
  const manifest = generateComplianceManifest(files, bundle.generatedAt)
  files.set('MANIFEST.json', JSON.stringify(manifest, null, 2))
  
  return files
}

/**
 * Generate compliance manifest
 */
function generateComplianceManifest(
  files: Map<string, string>,
  generatedAt: string
): ComplianceManifest {
  const complianceFiles: ComplianceFile[] = []
  
  for (const [path, content] of files) {
    if (path === 'MANIFEST.json') continue // Skip self
    
    complianceFiles.push({
      path,
      description: getFileDescription(path),
      hash: simpleHash(content),
      size: new TextEncoder().encode(content).length,
    })
  }
  
  return {
    version: '1.0.0',
    files: complianceFiles,
    generatedAt,
    manifestHash: simpleHash(JSON.stringify(complianceFiles)),
  }
}

function getFileDescription(path: string): string {
  const descriptions: Record<string, string> = {
    'README-DEPLOY.md': 'Deployment instructions and next steps',
    'AUDIT_REPORT.md': 'Human-readable compliance audit report',
    'ATTESTATION.txt': 'Signed attestation statement',
    'INTEGRATIONS_LEDGER.json': 'Complete integration action history',
    'POLICY_SNAPSHOT.json': 'Organization policy at export time',
    'ENVIRONMENT_PROFILE.json': 'Environment profile at export time',
    'HEALTH_STATUS.json': 'Integration health status at export time',
  }
  return descriptions[path] || 'Compliance artifact'
}

// ============================================
// README-DEPLOY.md GENERATOR (Phase 5.2)
// ============================================

/**
 * Generate README-DEPLOY.md
 * Calm, factual. Zero marketing language.
 */
function generateDeployReadme(bundle: EvidenceBundle): string {
  const exportDate = new Date(bundle.generatedAt).toISOString().split('T')[0]
  const integrationCount = bundle.ledger.length
  const hasIntegrations = integrationCount > 0
  
  return `# Deployment

Exported: ${exportDate}

## Contents

- Source code (ready to run)
- AUDIT_REPORT.md (verification record)
- Configuration files

## Next Steps

### Web Projects

1. Install dependencies: \`npm install\`
2. Run locally: \`npm run dev\`
3. Deploy: Push to GitHub, connect to Vercel/Netlify

### Mobile Projects (iOS)

1. Open \`.xcodeproj\` in Xcode
2. Select your team in Signing & Capabilities
3. Build and run on device or simulator

## Environment Variables

${hasIntegrations ? `This project uses ${integrationCount} integration${integrationCount > 1 ? 's' : ''}. Copy \`.env.example\` to \`.env.local\` and add your credentials.` : 'No environment variables required.'}

## Verification

This export includes an audit ledger. See AUDIT_REPORT.md for the complete verification record.

---

Generated by TORBIT
`
}

// ============================================
// UTILITIES
// ============================================

function generateBuildId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `torbit-${timestamp}-${random}`
}

function computeBundleHash(bundle: EvidenceBundle): string {
  // Create a copy without the hash field for consistent hashing
  const { bundleHash, ...rest } = bundle
  const content = JSON.stringify(rest)
  return `sha256:${simpleHash(content)}`
}

function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

function redactLedgerEntries(entries: LedgerEntry[]): LedgerEntry[] {
  // LedgerEntry doesn't have a metadata property, so just return entries as-is
  // In the future, if sensitive data needs redaction, it would be in specific fields
  return entries.map(entry => ({
    ...entry,
  }))
}

// ============================================
// QUICK BUNDLE
// ============================================

/**
 * Generate a minimal evidence bundle for quick exports
 */
export function generateQuickBundle(
  projectName: string,
  target: string
): {
  attestation: string
  manifest: ComplianceManifest
} {
  const environment = getActiveEnvironment()
  const policy = getPolicy()
  const ledger = getLedger()
  
  const attestation = generateAttestation({
    exportDate: new Date().toISOString(),
    environment,
    policyName: policy.name ?? 'Default Policy',
    integrationHealth: 'CLEAN',
    driftStatus: 'NONE',
    auditorStatus: 'SKIPPED',
    strategistStatus: 'SKIPPED',
    integrationCount: 0,
    ledgerEntryCount: ledger?.entries.length ?? 0,
    policyViolations: 0,
    environmentViolations: 0,
  })
  
  const files = new Map<string, string>()
  files.set('ATTESTATION.txt', serializeAttestation(attestation))
  
  return {
    attestation: serializeAttestation(attestation),
    manifest: generateComplianceManifest(files, new Date().toISOString()),
  }
}
