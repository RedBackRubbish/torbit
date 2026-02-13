/**
 * QA agent output schema
 * QA is responsible for testing, quality assurance, and verification
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, TestResultSchema, IssueSchema, FileChangeSchema } from './base'

/**
 * Test suite results
 */
export const TestSuiteSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['unit', 'integration', 'e2e', 'performance', 'security']),
  tests: z.array(TestResultSchema),
  duration: z.number().int().nonnegative(),
  coverage: z.object({
    lines: z.number().min(0).max(100).optional(),
    branches: z.number().min(0).max(100).optional(),
    functions: z.number().min(0).max(100).optional(),
    statements: z.number().min(0).max(100).optional(),
  }).optional(),
})

/**
 * Code quality metric
 */
export const QualityMetricSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  threshold: z.number().optional(),
  passed: z.boolean(),
})

/**
 * QA agent output schema
 */
export const QaOutputSchema = BaseAgentOutputSchema.extend({
  testSuites: z.array(TestSuiteSchema).optional(),
  issues: z.array(IssueSchema).optional(),
  coverage: z.object({
    percentage: z.number().min(0).max(100),
    trend: z.enum(['improving', 'stable', 'declining']).optional(),
  }).optional(),
  qualityMetrics: z.array(QualityMetricSchema).optional(),
  performance: z.object({
    slowTests: z.array(z.object({
      name: z.string(),
      duration: z.number().int().positive(),
      threshold: z.number().int().positive(),
    })).optional(),
    memoryLeaks: z.array(z.string()).optional(),
  }).optional(),
  regressions: z.array(z.object({
    test: z.string(),
    previousStatus: z.string(),
    currentStatus: z.string(),
  })).optional(),
  recommendations: z.array(z.string()).optional(),
})

export type QaOutput = z.infer<typeof QaOutputSchema>
