/**
 * Frontend agent output schema
 * Frontend is responsible for UI components, styling, and user-facing code
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, FileChangeSchema, IssueSchema } from './base'

/**
 * Component definition
 */
export const ComponentMetadataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['component', 'hook', 'utility', 'page', 'layout']),
  props: z.record(z.string(), z.object({
    type: z.string(),
    required: z.boolean().default(false),
    description: z.string().optional(),
  })).optional(),
  exports: z.array(z.string()).optional(),
})

/**
 * Styling information
 */
export const StylingMetadataSchema = z.object({
  framework: z.enum(['tailwind', 'css-modules', 'emotion', 'styled-components', 'plain-css']),
  colors: z.array(z.string()).optional(),
  breakpoints: z.array(z.string()).optional(),
  customTokens: z.record(z.string(), z.string()).optional(),
})

/**
 * Frontend agent output schema
 */
export const FrontendOutputSchema = BaseAgentOutputSchema.extend({
  components: z.array(ComponentMetadataSchema).optional(),
  styling: StylingMetadataSchema.optional(),
  files: z.array(FileChangeSchema).optional(),
  issues: z.array(IssueSchema).optional(),
  designGuidance: z.object({
    accessibility: z.array(z.string()).optional(),
    responsiveness: z.array(z.string()).optional(),
    performance: z.array(z.string()).optional(),
  }).optional(),
  testsCoverage: z.object({
    total: z.number().int().nonnegative(),
    covered: z.number().int().nonnegative(),
  }).optional(),
})

export type FrontendOutput = z.infer<typeof FrontendOutputSchema>
