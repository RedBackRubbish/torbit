/**
 * Production template path index for governed integrations.
 *
 * This index is intentionally lightweight (paths only) so health checks can
 * compute readiness metrics without loading full template source strings.
 */

import { getAllIntegrations } from './registry'

function buildTemplateIndex(): Record<string, string[]> {
  return Object.fromEntries(
    getAllIntegrations().map((manifest) => {
      const files = Array.from(new Set([
        ...(manifest.files.frontend ?? []),
        ...(manifest.files.backend ?? []),
        ...(manifest.files.mobile ?? []),
      ])).sort()

      return [manifest.id, files]
    })
  )
}

export const PRODUCTION_TEMPLATE_PATHS: Record<string, string[]> = buildTemplateIndex()

export function getProductionTemplatePaths(integrationId: string): string[] {
  return PRODUCTION_TEMPLATE_PATHS[integrationId] || []
}

export function hasProductionTemplatePath(integrationId: string, filePath: string): boolean {
  const paths = PRODUCTION_TEMPLATE_PATHS[integrationId]
  if (!paths) return false
  return paths.includes(filePath)
}
