/**
 * TORBIT - Integration Health Triggers
 * 
 * Automated health checks at critical moments:
 * - Project load: Verify existing integrations
 * - Pre-export: Ensure no drift before iOS bundle
 * - Pre-deploy: Final check before Vercel/Netlify
 * 
 * Philosophy: Quiet unless something is wrong.
 */

import { checkIntegrationHealth, formatHealthSummary } from './checker'
import type {
  HealthCheckResult,
  HealthCheckTrigger,
  HealthReport,
} from './types'

export interface TriggerContext {
  packageJsonContent: string
  onHealthy?: () => void
  onWarning?: (report: HealthReport) => void
  onCritical?: (report: HealthReport) => void
}

/**
 * Run health check on project load
 * 
 * Called when: User opens a project with integrations
 * Behavior: Silent if healthy, surfaces warnings in status bar
 */
export async function onProjectLoad(
  context: TriggerContext
): Promise<HealthCheckResult> {
  const result = await checkIntegrationHealth(context.packageJsonContent, {
    trigger: 'project-load',
    includeOrphans: true,
    checkDeprecations: true,
    silent: false,
  })
  
  handleResult(result, context)
  return result
}

/**
 * Run health check before iOS/Android export
 * 
 * Called when: User clicks "Export for Xcode" or similar
 * Behavior: Blocks export if critical issues, warns on drift
 */
export async function onPreExport(
  context: TriggerContext
): Promise<HealthCheckResult> {
  const result = await checkIntegrationHealth(context.packageJsonContent, {
    trigger: 'pre-export',
    includeOrphans: false,  // Don't block export for orphans
    checkDeprecations: true,
    silent: false,
  })
  
  handleResult(result, context)
  return result
}

/**
 * Run health check before deployment
 * 
 * Called when: User initiates Vercel/Netlify deploy
 * Behavior: Strict - blocks deploy on any issues
 */
export async function onPreDeploy(
  context: TriggerContext
): Promise<HealthCheckResult> {
  const result = await checkIntegrationHealth(context.packageJsonContent, {
    trigger: 'pre-deploy',
    includeOrphans: true,
    checkDeprecations: true,
    silent: false,
  })
  
  handleResult(result, context)
  return result
}

/**
 * Manual health check
 * 
 * Called when: User explicitly requests health check
 * Behavior: Full report with all details
 */
export async function onManualCheck(
  context: TriggerContext
): Promise<HealthCheckResult> {
  const result = await checkIntegrationHealth(context.packageJsonContent, {
    trigger: 'manual',
    includeOrphans: true,
    checkDeprecations: true,
    silent: false,
  })
  
  handleResult(result, context)
  return result
}

/**
 * Handle result and call appropriate callbacks
 */
function handleResult(
  result: HealthCheckResult,
  context: TriggerContext
): void {
  switch (result.report.status) {
    case 'healthy':
      context.onHealthy?.()
      break
    case 'warning':
      context.onWarning?.(result.report)
      break
    case 'critical':
      context.onCritical?.(result.report)
      break
  }
}

/**
 * Check if a trigger should block the operation
 */
export function shouldBlock(
  trigger: HealthCheckTrigger,
  result: HealthCheckResult
): boolean {
  switch (trigger) {
    case 'project-load':
      // Never block project load
      return false
      
    case 'pre-export':
      // Block only on critical issues
      return result.report.status === 'critical'
      
    case 'pre-deploy':
      // Block on any issues (strict mode)
      return result.report.status !== 'healthy'
      
    case 'manual':
    case 'scheduled':
      // Never block manual checks
      return false
      
    default:
      return false
  }
}

/**
 * Get user-facing message for a blocked operation
 */
export function getBlockMessage(
  trigger: HealthCheckTrigger,
  result: HealthCheckResult
): string {
  const summary = formatHealthSummary(result.report)
  
  switch (trigger) {
    case 'pre-export':
      return `Export blocked: ${summary}. Fix issues to continue.`
      
    case 'pre-deploy':
      return `Deploy blocked: ${summary}. All integrations must be healthy.`
      
    default:
      return summary
  }
}

/**
 * Create a trigger context from WebContainer
 * Helper for use in components
 */
export function createTriggerContext(
  packageJsonContent: string,
  callbacks?: Partial<TriggerContext>
): TriggerContext {
  return {
    packageJsonContent,
    ...callbacks,
  }
}
