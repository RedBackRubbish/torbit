/**
 * Strategist agent output schema
 * Strategist is responsible for governance review and strategic planning
 */

import { z } from 'zod'
import { BaseAgentOutputSchema } from './base'

/**
 * Protected invariant definition
 */
export const ProtectedInvariantSchema = z.object({
  description: z.string().min(1),
  scope: z.array(z.string()).min(1),
  severity: z.enum(['soft', 'hard']),
})

/**
 * Governance verdict
 */
export const GovernanceVerdictSchema = z.enum(['approved', 'approved_with_amendments', 'rejected', 'escalate'])

/**
 * Strategist agent output schema
 */
export const StrategistOutputSchema = BaseAgentOutputSchema.extend({
  verdict: GovernanceVerdictSchema.optional(),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
  scope: z.object({
    intent: z.string().min(1),
    affected_areas: z.array(z.string()),
  }).optional(),
  protected_invariants: z.array(ProtectedInvariantSchema).optional(),
  amendments: z.array(z.string()).optional(),
  rejection_reason: z.string().optional(),
  escalation_reason: z.string().optional(),
  notes: z.array(z.string()).optional(),
  review: z.object({
    positives: z.array(z.string()).optional(),
    concerns: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional(),
  }).optional(),
})

export type StrategistOutput = z.infer<typeof StrategistOutputSchema>
