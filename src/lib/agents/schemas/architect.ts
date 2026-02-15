/**
 * Architect agent output schema
 * Architect is responsible for high-level design, refactoring, and architectural decisions
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, PlanItemSchema, FileChangeSchema, IssueSchema } from './base'

/**
 * Architecture decision record
 */
export const ArchitectureDecisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  consequences: z.array(z.string()),
  alternatives: z.array(z.string()).optional(),
})

/**
 * System component definition
 */
export const ComponentDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['service', 'library', 'module', 'api', 'database', 'cache']),
  responsibility: z.string(),
  dependencies: z.array(z.string()).default([]),
  interfaces: z.array(z.object({
    name: z.string(),
    inputs: z.record(z.string(), z.string()),
    outputs: z.record(z.string(), z.string()),
  })).optional(),
})

/**
 * Architect agent output schema
 */
export const ArchitectOutputSchema = BaseAgentOutputSchema.extend({
  design: z.object({
    overview: z.string().min(1),
    components: z.array(ComponentDefinitionSchema).optional(),
    layers: z.array(z.string()).optional(),
  }).optional(),
  decisions: z.array(ArchitectureDecisionSchema).optional(),
  plan: z.array(PlanItemSchema).optional(),
  changes: z.array(FileChangeSchema).optional(),
  riskAnalysis: z.object({
    risks: z.array(z.object({
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      mitigation: z.string(),
    })).optional(),
    dependencies: z.array(z.string()).optional(),
  }).optional(),
  estimatedComplexity: z.enum(['trivial', 'simple', 'moderate', 'complex', 'architectural']).optional(),
})

export type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>
