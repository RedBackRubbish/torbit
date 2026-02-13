/**
 * Backend agent output schema
 * Backend is responsible for APIs, routes, middleware, and server logic
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, FileChangeSchema, IssueSchema } from './base'

/**
 * API endpoint definition
 */
export const EndpointSchema = z.object({
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  authentication: z.enum(['none', 'basic', 'bearer', 'api-key', 'oauth']).optional(),
  requestBody: z.object({
    type: z.string(),
    required: z.boolean().default(false),
  }).optional(),
  responseFormat: z.object({
    status: z.number().int().min(100).max(599),
    type: z.string(),
  }).optional(),
  errorHandling: z.array(z.object({
    status: z.number().int(),
    description: z.string(),
  })).optional(),
})

/**
 * Middleware configuration
 */
export const MiddlewareConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['auth', 'cors', 'logging', 'validation', 'error', 'custom']),
  order: z.number().int().nonnegative(),
  config: z.record(z.unknown()).optional(),
})

/**
 * Database connection configuration
 */
export const DatabaseConnectionSchema = z.object({
  type: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis']),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().optional(),
  pool: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
  }).optional(),
})

/**
 * Backend agent output schema
 */
export const BackendOutputSchema = BaseAgentOutputSchema.extend({
  endpoints: z.array(EndpointSchema).optional(),
  middleware: z.array(MiddlewareConfigSchema).optional(),
  database: DatabaseConnectionSchema.optional(),
  files: z.array(FileChangeSchema).optional(),
  issues: z.array(IssueSchema).optional(),
  security: z.object({
    vulnerabilities: z.array(z.object({
      cve: z.string().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      remediation: z.string(),
    })).optional(),
    recommendations: z.array(z.string()).optional(),
  }).optional(),
})

export type BackendOutput = z.infer<typeof BackendOutputSchema>
