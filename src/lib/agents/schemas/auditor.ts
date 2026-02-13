/**
 * Auditor agent output schema
 * Auditor is responsible for quality checks and verification
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, IssueSchema } from './base'

/**
 * Audit gate result
 */
export const AuditGateSchema = z.object({
  passed: z.boolean(),
  issues: z.array(IssueSchema),
})

/**
 * Auditor agent output schema
 */
export const AuditorOutputSchema = BaseAgentOutputSchema.extend({
  verdict: z.enum(['passed', 'passed_with_warnings', 'failed']).optional(),
  gates: z.object({
    visual: AuditGateSchema.optional(),
    functional: AuditGateSchema.optional(),
    hygiene: AuditGateSchema.optional(),
    security: AuditGateSchema.optional(),
    performance: AuditGateSchema.optional(),
    accessibility: AuditGateSchema.optional(),
  }).optional(),
  issues: z.array(IssueSchema).optional(),
  recommendations: z.array(z.string()).optional(),
  blockers: z.array(z.object({
    category: z.string(),
    description: z.string(),
    fix: z.string().optional(),
  })).optional(),
  warnings: z.array(z.object({
    category: z.string(),
    description: z.string(),
    resolution: z.string(),
  })).optional(),
  checksRun: z.array(z.string()).optional(),
  failureDetails: z.object({
    count: z.number().int().nonnegative(),
    byCategory: z.record(z.number().int().nonnegative()),
  }).optional(),
})

export type AuditorOutput = z.infer<typeof AuditorOutputSchema>
