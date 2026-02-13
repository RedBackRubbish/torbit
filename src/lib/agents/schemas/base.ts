/**
 * Base schemas for agent responses
 * All agent outputs must conform to these base types
 */

import { z } from 'zod'

/**
 * Structured plan item — used across agents for decomposition
 */
export const PlanItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  dependencies: z.array(z.string()).default([]),
  estimatedEffort: z.enum(['trivial', 'small', 'medium', 'large', 'xlarge']).optional(),
})

export type PlanItem = z.infer<typeof PlanItemSchema>

/**
 * File change — used across agents for code generation
 */
export const FileChangeSchema = z.object({
  path: z.string().min(1),
  action: z.enum(['create', 'edit', 'delete', 'rename']),
  content: z.string().optional(),
  language: z.string().optional(),
})

export type FileChange = z.infer<typeof FileChangeSchema>

/**
 * Issue/problem identified during audit or analysis
 */
export const IssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  category: z.string(),
  message: z.string().min(1),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  suggestion: z.string().optional(),
})

export type Issue = z.infer<typeof IssueSchema>

/**
 * Test result from QA agent
 */
export const TestResultSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['passed', 'failed', 'skipped', 'pending']),
  duration: z.number().int().nonnegative(),
  error: z.string().optional(),
  assertion: z.string().optional(),
})

export type TestResult = z.infer<typeof TestResultSchema>

/**
 * Deployment status from DevOps agent
 */
export const DeploymentStatusSchema = z.object({
  environment: z.string().min(1),
  status: z.enum(['pending', 'in-progress', 'success', 'failed', 'rolled-back']),
  timestamp: z.string().datetime().optional(),
  version: z.string().optional(),
  logs: z.array(z.string()).optional(),
  error: z.string().optional(),
})

export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>

/**
 * Base agent output structure
 * All agent responses extend this
 */
export const BaseAgentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  summary: z.string().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
})

export type BaseAgentOutput = z.infer<typeof BaseAgentOutputSchema>
