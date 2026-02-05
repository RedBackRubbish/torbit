/**
 * TORBIT - Freeze Mode Controller
 * 
 * Manages knowledge freeze states per project.
 * 
 * Modes:
 * - Frozen (default): No new knowledge injected
 * - Advisory: Suggestions allowed, no auto-apply
 * - Live: Suggestions + updates allowed (non-prod only)
 * 
 * Production environment ALWAYS forces Frozen.
 */

import type { FreezeMode, FreezeChange, OverrideRequest } from './types'
import { getProjectKnowledge, saveSnapshot } from './snapshot'

// ============================================
// FREEZE MODE OPERATIONS
// ============================================

/**
 * Get current freeze mode for project
 */
export function getFreezeMode(projectId: string): FreezeMode {
  const knowledge = getProjectKnowledge(projectId)
  return knowledge.snapshot.freezeMode
}

/**
 * Check if project is frozen
 */
export function isFrozen(projectId: string): boolean {
  return getFreezeMode(projectId) === 'frozen'
}

/**
 * Check if suggestions are allowed
 */
export function areSuggestionsAllowed(projectId: string): boolean {
  const mode = getFreezeMode(projectId)
  return mode === 'advisory' || mode === 'live'
}

/**
 * Check if updates are allowed
 */
export function areUpdatesAllowed(projectId: string): boolean {
  return getFreezeMode(projectId) === 'live'
}

/**
 * Change freeze mode
 * Returns false if change is not allowed
 */
export function changeFreezeMode(
  projectId: string,
  newMode: FreezeMode,
  changedBy: 'system' | 'user' | 'policy',
  reason: string,
  environment: 'local' | 'staging' | 'production'
): { success: boolean; error?: string } {
  // Production ALWAYS forces frozen
  if (environment === 'production' && newMode !== 'frozen') {
    return {
      success: false,
      error: 'Production environment requires frozen mode',
    }
  }
  
  // Live mode not allowed in staging
  if (environment === 'staging' && newMode === 'live') {
    return {
      success: false,
      error: 'Live mode not allowed in staging environment',
    }
  }
  
  const knowledge = getProjectKnowledge(projectId)
  const oldMode = knowledge.snapshot.freezeMode
  
  // Record the change
  const change: FreezeChange = {
    from: oldMode,
    to: newMode,
    changedAt: new Date().toISOString(),
    changedBy,
    reason,
  }
  
  knowledge.freezeHistory.push(change)
  knowledge.snapshot.freezeMode = newMode
  
  // If freezing, record when
  if (newMode === 'frozen') {
    knowledge.snapshot.frozenAt = new Date().toISOString()
    knowledge.snapshot.frozenBy = changedBy
  }
  
  saveSnapshot(projectId, knowledge.snapshot)
  
  return { success: true }
}

/**
 * Force freeze (called by production environment)
 */
export function forceFreeze(projectId: string): void {
  changeFreezeMode(
    projectId,
    'frozen',
    'policy',
    'Production environment requires frozen knowledge',
    'production'
  )
}

// ============================================
// OVERRIDE REQUESTS
// ============================================

/**
 * Request override of freeze mode
 * Used when user wants to update knowledge in frozen project
 */
export function requestOverride(
  projectId: string,
  requestedBy: string,
  reason: string
): OverrideRequest {
  const knowledge = getProjectKnowledge(projectId)
  
  const request: OverrideRequest = {
    id: `ovr-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    requestedBy,
    reason,
    status: 'pending',
  }
  
  knowledge.overrideRequests.push(request)
  
  return request
}

/**
 * Resolve override request
 */
export function resolveOverride(
  projectId: string,
  requestId: string,
  approved: boolean,
  resolvedBy: string
): { success: boolean; error?: string } {
  const knowledge = getProjectKnowledge(projectId)
  
  const request = knowledge.overrideRequests.find(r => r.id === requestId)
  if (!request) {
    return { success: false, error: 'Override request not found' }
  }
  
  request.status = approved ? 'approved' : 'denied'
  request.resolvedAt = new Date().toISOString()
  request.resolvedBy = resolvedBy
  
  // If approved, temporarily allow updates
  if (approved) {
    // This would typically set a temporary override flag
    // For now, we just record the approval
  }
  
  return { success: true }
}

/**
 * Get pending override requests
 */
export function getPendingOverrides(projectId: string): OverrideRequest[] {
  const knowledge = getProjectKnowledge(projectId)
  return knowledge.overrideRequests.filter(r => r.status === 'pending')
}

// ============================================
// FREEZE VALIDATION
// ============================================

/**
 * Validate if operation is allowed given freeze mode
 */
export function validateOperation(
  projectId: string,
  operation: 'inject-knowledge' | 'offer-suggestion' | 'update-facts'
): { allowed: boolean; reason?: string } {
  const mode = getFreezeMode(projectId)
  
  switch (operation) {
    case 'inject-knowledge':
      if (mode === 'frozen') {
        return { allowed: false, reason: 'Knowledge is frozen' }
      }
      if (mode === 'advisory') {
        return { allowed: false, reason: 'Advisory mode: suggestions only' }
      }
      return { allowed: true }
      
    case 'offer-suggestion':
      if (mode === 'frozen') {
        return { allowed: false, reason: 'Knowledge is frozen' }
      }
      return { allowed: true }
      
    case 'update-facts':
      if (mode !== 'live') {
        return { allowed: false, reason: 'Updates only allowed in live mode' }
      }
      return { allowed: true }
      
    default:
      return { allowed: false, reason: 'Unknown operation' }
  }
}

// ============================================
// ENVIRONMENT ENFORCEMENT
// ============================================

/**
 * Enforce freeze mode based on environment change
 */
export function enforceEnvironmentFreeze(
  projectId: string,
  environment: 'local' | 'staging' | 'production'
): void {
  const currentMode = getFreezeMode(projectId)
  
  // Production: force frozen
  if (environment === 'production' && currentMode !== 'frozen') {
    forceFreeze(projectId)
  }
  
  // Staging: force advisory or frozen
  if (environment === 'staging' && currentMode === 'live') {
    changeFreezeMode(
      projectId,
      'advisory',
      'policy',
      'Staging environment restricts live mode',
      environment
    )
  }
}
