/**
 * Central schema exports
 */

export * from './base'
export * from './architect'
export * from './frontend'
export * from './backend'
export * from './database'
export * from './devops'
export * from './qa'
export * from './planner'
export * from './strategist'
export * from './auditor'

import type { AgentId } from '@/lib/tools/definitions'
import { ArchitectOutputSchema } from './architect'
import { FrontendOutputSchema } from './frontend'
import { BackendOutputSchema } from './backend'
import { DatabaseOutputSchema } from './database'
import { DevopsOutputSchema } from './devops'
import { QaOutputSchema } from './qa'
import { PlannerOutputSchema } from './planner'
import { StrategistOutputSchema } from './strategist'
import { AuditorOutputSchema } from './auditor'

/**
 * Map of agent schemas
 */
export const AGENT_SCHEMAS = {
  architect: ArchitectOutputSchema,
  frontend: FrontendOutputSchema,
  backend: BackendOutputSchema,
  database: DatabaseOutputSchema,
  devops: DevopsOutputSchema,
  qa: QaOutputSchema,
  planner: PlannerOutputSchema,
  strategist: StrategistOutputSchema,
  auditor: AuditorOutputSchema,
} as const satisfies Record<AgentId, any>

export type AgentSchemaMap = typeof AGENT_SCHEMAS
