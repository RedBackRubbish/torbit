/**
 * Database agent output schema
 * Database is responsible for schema design, migrations, and data modeling
 */

import { z } from 'zod'
import { BaseAgentOutputSchema, FileChangeSchema, IssueSchema } from './base'

/**
 * Table column definition
 */
export const ColumnDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean().default(false),
  default: z.string().optional(),
  primaryKey: z.boolean().default(false),
  unique: z.boolean().default(false),
  references: z.object({
    table: z.string(),
    column: z.string(),
    onDelete: z.enum(['CASCADE', 'RESTRICT', 'NO ACTION', 'SET NULL']).optional(),
  }).optional(),
})

/**
 * Table definition
 */
export const TableDefinitionSchema = z.object({
  name: z.string().min(1),
  columns: z.array(ColumnDefinitionSchema).min(1),
  indexes: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
    unique: z.boolean().default(false),
  })).optional(),
  constraints: z.array(z.object({
    type: z.enum(['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK']),
    definition: z.string(),
  })).optional(),
})

/**
 * Migration definition
 */
export const MigrationSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  timestamp: z.string().datetime(),
  up: z.string().min(1),
  down: z.string().min(1),
  description: z.string().optional(),
})

/**
 * Database agent output schema
 */
export const DatabaseOutputSchema = BaseAgentOutputSchema.extend({
  schema: z.object({
    tables: z.array(TableDefinitionSchema).optional(),
    views: z.array(z.object({
      name: z.string(),
      query: z.string(),
    })).optional(),
  }).optional(),
  migrations: z.array(MigrationSchema).optional(),
  files: z.array(FileChangeSchema).optional(),
  issues: z.array(IssueSchema).optional(),
  performance: z.object({
    indexingRecommendations: z.array(z.string()).optional(),
    queryOptimizations: z.array(z.string()).optional(),
  }).optional(),
  dataIntegrity: z.object({
    constraints: z.array(z.string()).optional(),
    validationRules: z.array(z.string()).optional(),
  }).optional(),
})

export type DatabaseOutput = z.infer<typeof DatabaseOutputSchema>
