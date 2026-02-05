/**
 * TORBIT - Integration Health Check Types
 * 
 * Types for detecting drift, deprecation, and integrity issues
 * in the integration supply chain.
 */

export type HealthStatus = 'healthy' | 'warning' | 'critical'

export type IssueType = 
  | 'version-drift'      // Installed version differs from manifest
  | 'missing-package'    // Manifest requires package not installed
  | 'orphan-package'     // Installed package not in any manifest
  | 'deprecated-sdk'     // Package is deprecated with known sunset
  | 'security-advisory'  // Package has known CVE
  | 'peer-mismatch'      // Peer dependency version conflict

export interface DriftIssue {
  type: 'version-drift'
  integrationId: string
  packageName: string
  manifestVersion: string   // What we declared
  installedVersion: string  // What's actually installed
  severity: 'warning' | 'critical'
}

export interface MissingPackageIssue {
  type: 'missing-package'
  integrationId: string
  packageName: string
  requiredVersion: string
  severity: 'critical'
}

export interface OrphanPackageIssue {
  type: 'orphan-package'
  packageName: string
  installedVersion: string
  severity: 'warning'
  suggestion?: string  // "May be from [integration] - consider adding manifest"
}

export interface DeprecationIssue {
  type: 'deprecated-sdk'
  integrationId: string
  packageName: string
  installedVersion: string
  sunsetDate?: string       // ISO date when support ends
  replacement?: string      // Recommended replacement package
  migrationGuide?: string   // URL to migration docs
  severity: 'warning' | 'critical'
}

export interface SecurityIssue {
  type: 'security-advisory'
  packageName: string
  installedVersion: string
  cveId: string
  severity: 'warning' | 'critical'
  fixVersion?: string
}

export interface PeerMismatchIssue {
  type: 'peer-mismatch'
  integrationId: string
  packageName: string
  peerPackage: string
  requiredPeerVersion: string
  installedPeerVersion: string
  severity: 'warning'
}

export type HealthIssue =
  | DriftIssue
  | MissingPackageIssue
  | OrphanPackageIssue
  | DeprecationIssue
  | SecurityIssue
  | PeerMismatchIssue

export interface HealthReport {
  status: HealthStatus
  timestamp: string           // ISO timestamp
  trigger: HealthCheckTrigger
  integrations: IntegrationHealth[]
  issues: HealthIssue[]
  summary: {
    total: number
    healthy: number
    warnings: number
    critical: number
  }
}

export interface IntegrationHealth {
  integrationId: string
  name: string
  status: HealthStatus
  packages: PackageHealth[]
  issues: HealthIssue[]
}

export interface PackageHealth {
  name: string
  manifestVersion: string
  installedVersion: string | null
  status: 'match' | 'drift' | 'missing' | 'deprecated'
}

export type HealthCheckTrigger = 
  | 'project-load'
  | 'pre-export'
  | 'pre-deploy'
  | 'manual'
  | 'scheduled'

export interface HealthCheckOptions {
  trigger: HealthCheckTrigger
  integrationIds?: string[]   // Check specific integrations (default: all installed)
  includeOrphans?: boolean    // Check for orphan packages (default: true)
  checkDeprecations?: boolean // Check deprecation registry (default: true)
  silent?: boolean            // Suppress UI notifications (default: false)
}

export interface HealthFix {
  issueType: IssueType
  packageName: string
  action: 'install' | 'update' | 'remove' | 'replace'
  command: string             // npm/pnpm command to run
  description: string
  requiresConsent: boolean    // Always true for governance
}

export interface HealthCheckResult {
  report: HealthReport
  fixes: HealthFix[]
  canAutoFix: boolean         // False if any critical issues require manual intervention
}
