/**
 * TORBIT - Integration Health Checker
 * 
 * Detects drift, deprecation, and integrity issues in installed integrations.
 * Runs on: project load, pre-export, pre-deploy.
 * 
 * Philosophy: Quiet unless something is wrong.
 */

import { getAllIntegrations, getIntegration } from '../registry'
import { getProductionTemplatePaths } from '../template-paths'
import { checkDeprecation } from './deprecations'
import type {
  HealthCheckOptions,
  HealthCheckResult,
  HealthReport,
  HealthIssue,
  HealthStatus,
  IntegrationHealth,
  PackageHealth,
  HealthFix,
  DriftIssue,
  MissingPackageIssue,
  OrphanPackageIssue,
  DeprecationIssue,
  TemplateCompletenessSummary,
} from './types'

/**
 * Parse installed packages from package.json content
 */
function parseInstalledPackages(
  packageJsonContent: string
): Map<string, string> {
  const installed = new Map<string, string>()
  
  try {
    const pkg = JSON.parse(packageJsonContent)
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    
    for (const [name, version] of Object.entries(deps)) {
      // Strip semver prefixes for comparison
      const cleanVersion = String(version).replace(/^[\^~>=<]+/, '')
      installed.set(name, cleanVersion)
    }
  } catch {
    console.error('[HealthChecker] Failed to parse package.json')
  }
  
  return installed
}

/**
 * Compare versions (basic semver comparison)
 * Returns true if versions match exactly
 */
function versionsMatch(manifestVersion: string, installedVersion: string): boolean {
  // Strip any semver prefixes
  const clean1 = manifestVersion.replace(/^[\^~>=<]+/, '')
  const clean2 = installedVersion.replace(/^[\^~>=<]+/, '')
  return clean1 === clean2
}

/**
 * Get all packages declared in registered integration manifests
 */
function getManifestPackages(): Map<string, { integrationId: string; version: string }[]> {
  const packages = new Map<string, { integrationId: string; version: string }[]>()
  const allManifests = getAllIntegrations()
  
  for (const manifest of allManifests) {
    // Collect packages from all platform groups
    const allPkgs = {
      ...manifest.packages.frontend,
      ...manifest.packages.backend,
      ...manifest.packages.mobile,
    }
    
    for (const [pkgName, version] of Object.entries(allPkgs)) {
      const existing = packages.get(pkgName) || []
      existing.push({ integrationId: manifest.id, version })
      packages.set(pkgName, existing)
    }
  }
  
  return packages
}

/**
 * Detect which integrations are installed based on packages
 */
function detectInstalledIntegrations(
  installedPackages: Map<string, string>
): Set<string> {
  const installed = new Set<string>()
  const allManifests = getAllIntegrations()
  
  for (const manifest of allManifests) {
    // Collect all packages from manifest
    const allPkgs = {
      ...manifest.packages.frontend,
      ...manifest.packages.backend,
      ...manifest.packages.mobile,
    }
    const pkgNames = Object.keys(allPkgs)
    
    // An integration is "installed" if any of its packages exist
    if (pkgNames.length > 0 && installedPackages.has(pkgNames[0])) {
      installed.add(manifest.id)
    }
  }
  
  return installed
}

/**
 * Check a single integration's health (internal helper)
 */
function checkSingleIntegration(
  integrationId: string,
  installedPackages: Map<string, string>,
  options: HealthCheckOptions
): IntegrationHealth {
  const manifest = getIntegration(integrationId)
  
  if (!manifest) {
    return {
      integrationId,
      name: integrationId,
      status: 'critical',
      packages: [],
      issues: [],
    }
  }
  
  const packages: PackageHealth[] = []
  const issues: HealthIssue[] = []
  
  // Collect all packages from manifest
  const allPkgs = {
    ...manifest.packages.frontend,
    ...manifest.packages.backend,
    ...manifest.packages.mobile,
  }
  
  for (const [pkgName, manifestVersion] of Object.entries(allPkgs)) {
    const installedVersion = installedPackages.get(pkgName)
    
    if (!installedVersion) {
      // Package is missing
      packages.push({
        name: pkgName,
        manifestVersion,
        installedVersion: null,
        status: 'missing',
      })
      
      const issue: MissingPackageIssue = {
        type: 'missing-package',
        integrationId,
        packageName: pkgName,
        requiredVersion: manifestVersion,
        severity: 'critical',
      }
      issues.push(issue)
    } else if (!versionsMatch(manifestVersion, installedVersion)) {
      // Version drift detected
      packages.push({
        name: pkgName,
        manifestVersion,
        installedVersion,
        status: 'drift',
      })
      
      const issue: DriftIssue = {
        type: 'version-drift',
        integrationId,
        packageName: pkgName,
        manifestVersion,
        installedVersion,
        severity: 'warning',
      }
      issues.push(issue)
    } else {
      // Check for deprecation
      if (options.checkDeprecations !== false) {
        const deprecation = checkDeprecation(pkgName, installedVersion)
        
        if (deprecation) {
          packages.push({
            name: pkgName,
            manifestVersion,
            installedVersion,
            status: 'deprecated',
          })
          
          const issue: DeprecationIssue = {
            type: 'deprecated-sdk',
            integrationId,
            packageName: pkgName,
            installedVersion,
            sunsetDate: deprecation.sunsetDate,
            replacement: deprecation.replacement,
            migrationGuide: deprecation.migrationGuide,
            severity: deprecation.severity,
          }
          issues.push(issue)
        } else {
          packages.push({
            name: pkgName,
            manifestVersion,
            installedVersion,
            status: 'match',
          })
        }
      } else {
        packages.push({
          name: pkgName,
          manifestVersion,
          installedVersion,
          status: 'match',
        })
      }
    }
  }
  
  // Determine overall status
  let status: HealthStatus = 'healthy'
  if (issues.some((i) => i.severity === 'critical')) {
    status = 'critical'
  } else if (issues.length > 0) {
    status = 'warning'
  }
  
  return {
    integrationId,
    name: manifest.name,
    status,
    packages,
    issues,
  }
}

/**
 * Detect orphan packages (installed but not in any manifest)
 */
function detectOrphanPackages(
  installedPackages: Map<string, string>,
  manifestPackages: Map<string, { integrationId: string; version: string }[]>
): OrphanPackageIssue[] {
  const orphans: OrphanPackageIssue[] = []
  
  // Common framework packages to ignore
  const ignoredPrefixes = [
    'next', 'react', 'typescript', 'eslint', 'tailwind',
    '@types/', 'vitest', 'vite', 'postcss', 'autoprefixer',
    '@testing-library', 'framer-motion', 'zod', 'zustand',
    '@ai-sdk', '@openrouter', 'ai', 'monaco', 'lucide',
  ]
  
  for (const [pkgName, version] of installedPackages.entries()) {
    // Skip framework packages
    if (ignoredPrefixes.some((prefix) => pkgName.startsWith(prefix))) {
      continue
    }
    
    // Check if it's in any manifest
    if (!manifestPackages.has(pkgName)) {
      // Try to suggest which integration it might belong to
      let suggestion: string | undefined
      
      if (pkgName.includes('stripe')) {
        suggestion = 'May be related to Stripe integration'
      } else if (pkgName.includes('firebase')) {
        suggestion = 'May be related to Firebase integration'
      } else if (pkgName.includes('supabase')) {
        suggestion = 'May be related to Supabase integration'
      } else if (pkgName.includes('clerk')) {
        suggestion = 'May be related to Clerk integration'
      } else if (pkgName.includes('auth')) {
        suggestion = 'May be related to Auth integration'
      }
      
      orphans.push({
        type: 'orphan-package',
        packageName: pkgName,
        installedVersion: version,
        severity: 'warning',
        suggestion,
      })
    }
  }
  
  return orphans
}

/**
 * Generate fix commands for issues
 */
function generateFixes(issues: HealthIssue[]): HealthFix[] {
  const fixes: HealthFix[] = []
  
  for (const issue of issues) {
    switch (issue.type) {
      case 'missing-package':
        fixes.push({
          issueType: issue.type,
          packageName: issue.packageName,
          action: 'install',
          command: `pnpm add ${issue.packageName}@${issue.requiredVersion}`,
          description: `Install ${issue.packageName}@${issue.requiredVersion}`,
          requiresConsent: true,
        })
        break
        
      case 'version-drift':
        fixes.push({
          issueType: issue.type,
          packageName: issue.packageName,
          action: 'update',
          command: `pnpm add ${issue.packageName}@${issue.manifestVersion}`,
          description: `Update ${issue.packageName} from ${issue.installedVersion} to ${issue.manifestVersion}`,
          requiresConsent: true,
        })
        break
        
      case 'deprecated-sdk':
        if (issue.replacement) {
          fixes.push({
            issueType: issue.type,
            packageName: issue.packageName,
            action: 'replace',
            command: `pnpm remove ${issue.packageName} && pnpm add ${issue.replacement}`,
            description: `Replace ${issue.packageName} with ${issue.replacement}`,
            requiresConsent: true,
          })
        }
        break
        
      case 'orphan-package':
        fixes.push({
          issueType: issue.type,
          packageName: issue.packageName,
          action: 'remove',
          command: `pnpm remove ${issue.packageName}`,
          description: `Remove orphan package ${issue.packageName}`,
          requiresConsent: true,
        })
        break
    }
  }
  
  return fixes
}

function calculateTemplateCompleteness(
  integrations: IntegrationHealth[]
): TemplateCompletenessSummary {
  const checkedIntegrations = integrations.filter((integration) => integration.packages.length > 0)
  let mappedIntegrations = 0
  let partiallyMappedIntegrations = 0
  let requiredTemplateFileCount = 0
  let mappedTemplateFileCount = 0
  const uncoveredIntegrations: string[] = []

  for (const integration of checkedIntegrations) {
    const manifest = getIntegration(integration.integrationId)
    if (!manifest) {
      uncoveredIntegrations.push(integration.integrationId)
      continue
    }

    const requiredPaths = Array.from(new Set([
      ...(manifest.files.frontend ?? []),
      ...(manifest.files.backend ?? []),
      ...(manifest.files.mobile ?? []),
    ]))
    const availablePaths = new Set(getProductionTemplatePaths(integration.integrationId))

    requiredTemplateFileCount += requiredPaths.length

    let localMappedFiles = 0
    for (const filePath of requiredPaths) {
      if (availablePaths.has(filePath)) {
        localMappedFiles += 1
      }
    }
    mappedTemplateFileCount += localMappedFiles

    if (requiredPaths.length === 0 || localMappedFiles === requiredPaths.length) {
      mappedIntegrations += 1
      continue
    }

    if (localMappedFiles > 0) {
      partiallyMappedIntegrations += 1
    }
    uncoveredIntegrations.push(integration.integrationId)
  }

  const templateFileCount = mappedTemplateFileCount
  const coveragePercent = checkedIntegrations.length === 0
    ? 100
    : Math.round((mappedIntegrations / checkedIntegrations.length) * 100)
  const fileCoveragePercent = requiredTemplateFileCount === 0
    ? 100
    : Math.round((mappedTemplateFileCount / requiredTemplateFileCount) * 100)

  return {
    checkedIntegrations: checkedIntegrations.length,
    mappedIntegrations,
    partiallyMappedIntegrations,
    uncoveredIntegrations,
    templateFileCount,
    requiredTemplateFileCount,
    mappedTemplateFileCount,
    fileCoveragePercent,
    coveragePercent,
  }
}

/**
 * Run a full health check on project integrations
 */
export async function checkIntegrationHealth(
  packageJsonContent: string,
  options: HealthCheckOptions = { trigger: 'manual' }
): Promise<HealthCheckResult> {
  const installedPackages = parseInstalledPackages(packageJsonContent)
  const manifestPackages = getManifestPackages()
  const installedIntegrations = detectInstalledIntegrations(installedPackages)
  
  // Check each installed integration
  const integrations: IntegrationHealth[] = []
  const allIssues: HealthIssue[] = []
  
  // If specific integrations requested, check only those
  const integrationsToCheck = options.integrationIds 
    ? new Set(options.integrationIds)
    : installedIntegrations
  
  for (const integrationId of integrationsToCheck) {
    const health = checkSingleIntegration(integrationId, installedPackages, options)
    integrations.push(health)
    allIssues.push(...health.issues)
  }
  
  // Check for orphan packages
  if (options.includeOrphans !== false) {
    const orphans = detectOrphanPackages(installedPackages, manifestPackages)
    allIssues.push(...orphans)
  }
  
  // Determine overall status
  let status: HealthStatus = 'healthy'
  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length
  
  if (criticalCount > 0) {
    status = 'critical'
  } else if (warningCount > 0) {
    status = 'warning'
  }
  
  // Generate fixes
  const fixes = generateFixes(allIssues)
  const templateCompleteness = calculateTemplateCompleteness(integrations)

  const report: HealthReport = {
    status,
    timestamp: new Date().toISOString(),
    trigger: options.trigger,
    integrations,
    issues: allIssues,
    summary: {
      total: integrations.length,
      healthy: integrations.filter((i) => i.status === 'healthy').length,
      warnings: warningCount,
      critical: criticalCount,
      templateCompleteness,
    },
  }
  
  return {
    report,
    fixes,
    canAutoFix: criticalCount === 0 || fixes.length > 0,
  }
}

/**
 * Quick health check - returns true if healthy, false if issues
 */
export async function isHealthy(packageJsonContent: string): Promise<boolean> {
  const result = await checkIntegrationHealth(packageJsonContent, {
    trigger: 'manual',
    silent: true,
  })
  return result.report.status === 'healthy'
}

/**
 * Get a human-readable summary of the health report
 */
export function formatHealthSummary(report: HealthReport): string {
  const templateSummary = report.summary.templateCompleteness
  const templateCoverage = templateSummary.checkedIntegrations === 0
    ? 'Template coverage N/A'
    : `Template coverage ${templateSummary.coveragePercent}% (${templateSummary.fileCoveragePercent}% files)`

  if (report.status === 'healthy') {
    return `✓ All ${report.summary.total} integrations healthy • ${templateCoverage}`
  }
  
  const parts: string[] = []
  
  if (report.summary.critical > 0) {
    parts.push(`${report.summary.critical} critical`)
  }
  if (report.summary.warnings > 0) {
    parts.push(`${report.summary.warnings} warnings`)
  }
  
  return `⚠ Integration issues: ${parts.join(', ')} • ${templateCoverage}`
}
