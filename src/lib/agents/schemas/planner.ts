/**
 * Planner agent output schema
 * Planner is responsible for breaking down tasks, planning, and prioritization
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, PlanItemSchema } from './base'

/**
 * Task breakdown hierarchy
 */
export const TaskHierarchySchema = z.object({
  epic: z.string().min(1),
  story: z.string().min(1),
  tasks: z.array(PlanItemSchema).min(1),
})

/**
 * Resource allocation
 */
export const ResourceAllocationSchema = z.object({
  agent: z.enum(['architect', 'frontend', 'backend', 'database', 'devops', 'qa', 'strategist']),
  estimatedHours: z.number().positive(),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
})

/**
 * Dependency graph edge
 */
export const DependencyEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['blocks', 'depends-on', 'related-to']),
})

/**
 * Planner agent output schema
 */
export const PlannerOutputSchema = BaseAgentOutputSchema.extend({
  plan: z.array(PlanItemSchema).optional(),
  hierarchy: z.array(TaskHierarchySchema).optional(),
  timeline: z.object({
    phases: z.array(z.object({
      name: z.string(),
      startDay: z.number().int().nonnegative(),
      endDay: z.number().int().nonnegative(),
      milestones: z.array(z.string()).optional(),
    })).optional(),
    criticalPath: z.array(z.string()).optional(),
    estimatedDuration: z.object({
      optimistic: z.number().positive(),
      realistic: z.number().positive(),
      pessimistic: z.number().positive(),
    }).optional(),
  }).optional(),
  resources: z.array(ResourceAllocationSchema).optional(),
  dependencies: z.array(DependencyEdgeSchema).optional(),
  risks: z.array(z.object({
    description: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
  })).optional(),
  assumptions: z.array(z.string()).optional(),
})

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>
