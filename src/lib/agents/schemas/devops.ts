/**
 * DevOps agent output schema
 * DevOps is responsible for deployments, infrastructure, and CI/CD pipelines
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, FileChangeSchema, IssueSchema, DeploymentStatusSchema } from './base'

/**
 * Infrastructure resource definition
 */
export const InfrastructureResourceSchema = z.object({
  type: z.enum(['compute', 'storage', 'network', 'database', 'cache', 'queue', 'cdn']),
  name: z.string().min(1),
  provider: z.enum(['aws', 'gcp', 'azure', 'heroku', 'vercel', 'netlify', 'custom']),
  configuration: z.record(z.string(), z.unknown()).optional(),
})

/**
 * CI/CD pipeline stage
 */
export const PipelineStageSchema = z.object({
  name: z.string().min(1),
  steps: z.array(z.object({
    name: z.string(),
    command: z.string(),
    timeout: z.number().int().positive().optional(),
    onFailure: z.enum(['continue', 'skip', 'stop']).default('stop'),
  })).min(1),
  runOn: z.enum(['linux', 'macos', 'windows', 'docker']).optional(),
  artifacts: z.array(z.string()).optional(),
})

/**
 * Deployment configuration
 */
export const DeploymentConfigSchema = z.object({
  environment: z.string().min(1),
  strategy: z.enum(['blue-green', 'rolling', 'canary', 'recreate']).optional(),
  healthChecks: z.array(z.object({
    type: z.enum(['http', 'tcp', 'command']),
    endpoint: z.string().optional(),
    interval: z.number().int().positive(),
    timeout: z.number().int().positive(),
  })).optional(),
  rollback: z.object({
    enabled: z.boolean().default(true),
    onFailure: z.boolean().default(true),
    maxAttempts: z.number().int().positive().default(3),
  }).optional(),
})

/**
 * DevOps agent output schema
 */
export const DevopsOutputSchema = BaseAgentOutputSchema.extend({
  infrastructure: z.array(InfrastructureResourceSchema).optional(),
  pipeline: z.array(PipelineStageSchema).optional(),
  deployments: z.array(DeploymentStatusSchema).optional(),
  files: z.array(FileChangeSchema).optional(),
  issues: z.array(IssueSchema).optional(),
  configurations: z.object({
    docker: z.string().optional(),
    kubernetes: z.string().optional(),
    terraform: z.string().optional(),
  }).optional(),
  monitoring: z.object({
    metrics: z.array(z.string()).optional(),
    alerts: z.array(z.string()).optional(),
    dashboards: z.array(z.string()).optional(),
  }).optional(),
  security: z.object({
    secrets: z.array(z.string()).optional(),
    certificates: z.array(z.string()).optional(),
    vulnerabilities: z.array(z.string()).optional(),
  }).optional(),
})

export type DevopsOutput = z.infer<typeof DevopsOutputSchema>
