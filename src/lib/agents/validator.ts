/**
 * Agent Output Validation Layer
 *
 * Validates all agent outputs against strict schemas before consumption.
 * Provides clear error messages suitable for frontend display.
 */

import { z, ZodError } from 'zod'
import type { AgentId } from '@/lib/tools/definitions'
import { AGENT_SCHEMAS } from './schemas'

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors: ValidationError[]
  raw: unknown
}

/**
 * Single validation error with context
 */
export interface ValidationError {
  path: string
  message: string
  code: string
  received?: unknown
  expected?: string
}

/**
 * Convert Zod error to user-friendly validation errors
 */
function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'root',
    message: formatZodMessage(issue),
    code: issue.code,
    received: issue.received,
    expected: issue.expected,
  }))
}

/**
 * Format individual Zod issue into human-readable message
 */
function formatZodMessage(issue: z.ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return `Expected ${issue.expected} but received ${typeof issue.received}`
    case 'invalid_enum_value':
      return `Must be one of: ${issue.options?.join(', ')}`
    case 'too_small':
      if (issue.type === 'string') return `String must be at least ${issue.minimum} characters`
      if (issue.type === 'array') return `Array must have at least ${issue.minimum} items`
      return `Value must be at least ${issue.minimum}`
    case 'too_big':
      if (issue.type === 'string') return `String must be at most ${issue.maximum} characters`
      if (issue.type === 'array') return `Array must have at most ${issue.maximum} items`
      return `Value must be at most ${issue.maximum}`
    case 'invalid_string':
      return `Invalid ${issue.validation}: ${issue.message}`
    case 'custom':
      return issue.message
    default:
      return issue.message || 'Validation failed'
  }
}

/**
 * Validate agent output against its schema
 *
 * @param agentId - The agent that produced the output
 * @param output - The raw output to validate
 * @returns Validation result with errors or parsed data
 */
export function validateAgentOutput<A extends AgentId>(
  agentId: A,
  output: unknown
): ValidationResult<any> {
  const schema = AGENT_SCHEMAS[agentId]

  if (!schema) {
    return {
      success: false,
      errors: [
        {
          path: 'root',
          message: `No schema defined for agent: ${agentId}`,
          code: 'unknown_agent',
        },
      ],
      raw: output,
    }
  }

  try {
    const parsed = schema.parse(output)
    return {
      success: true,
      data: parsed,
      errors: [],
      raw: output,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodError(error),
        raw: output,
      }
    }

    return {
      success: false,
      errors: [
        {
          path: 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'unknown_error',
        },
      ],
      raw: output,
    }
  }
}

/**
 * Safe validator that returns null on invalid output instead of throwing
 */
export function validateAgentOutputSafe<A extends AgentId>(
  agentId: A,
  output: unknown
): any | null {
  const result = validateAgentOutput(agentId, output)
  return result.success ? result.data : null
}

/**
 * Format validation errors for frontend display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'No errors'
  if (errors.length === 1) return errors[0].message

  return (
    `${errors.length} validation errors:\n` +
    errors.map((e) => `  • ${e.path}: ${e.message}`).join('\n')
  )
}

/**
 * Throw if validation fails — use this at entry points
 */
export function assertValidAgentOutput<A extends AgentId>(
  agentId: A,
  output: unknown,
  context?: string
): any {
  const result = validateAgentOutput(agentId, output)

  if (!result.success) {
    const errorMsg = formatValidationErrors(result.errors)
    const ctx = context ? ` (${context})` : ''
    throw new Error(`Invalid ${agentId} output${ctx}:\n${errorMsg}`)
  }

  return result.data
}

/**
 * Validation statistics
 */
export interface ValidationStats {
  total: number
  passed: number
  failed: number
  passRate: number
  errorCounts: Record<string, number>
}

let validationStats: ValidationStats = {
  total: 0,
  passed: 0,
  failed: 0,
  passRate: 0,
  errorCounts: {},
}

/**
 * Reset validation statistics
 */
export function resetValidationStats(): void {
  validationStats = {
    total: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
    errorCounts: {},
  }
}

/**
 * Get current validation statistics
 */
export function getValidationStats(): Readonly<ValidationStats> {
  return { ...validationStats }
}

/**
 * Record a validation attempt
 */
export function recordValidation(result: ValidationResult<any>): void {
  validationStats.total++

  if (result.success) {
    validationStats.passed++
  } else {
    validationStats.failed++
    for (const error of result.errors) {
      validationStats.errorCounts[error.code] = (validationStats.errorCounts[error.code] || 0) + 1
    }
  }

  validationStats.passRate = validationStats.passed / validationStats.total
}

/**
 * Validate with stats recording
 */
export function validateAgentOutputWithStats<A extends AgentId>(
  agentId: A,
  output: unknown
): ValidationResult<any> {
  const result = validateAgentOutput(agentId, output)
  recordValidation(result)
  return result
}
