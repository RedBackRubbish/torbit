import fs from 'node:fs'
import path from 'node:path'
import type { MemoryLedgerEvent } from '@/lib/knowledge/memory/events'
import type { ProjectKnowledge } from '@/lib/knowledge/memory/types'

interface PersistedCheckpoint {
  name: string
  timestamp: number
  reason?: string
  files: Record<string, string>
  dbState?: PersistedDatabaseSnapshot
  deploymentConfig?: PersistedDeploymentConfig
}

interface PersistedDatabaseSnapshot {
  schema?: Record<string, { columns: Array<{ name: string; type: string; nullable: boolean }>; indexes: string[] }>
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface PersistedDeploymentConfig {
  provider?: string
  environment?: string
  branch?: string
  url?: string
  lastDeploymentId?: string
  config?: Record<string, unknown>
  updatedAt?: number
}

interface PersistedProjectState {
  version: 1
  updatedAt: string
  knowledge?: ProjectKnowledge
  memoryEvents?: MemoryLedgerEvent[]
  checkpoints?: Record<string, PersistedCheckpoint>
}

interface RuntimeCheckpoint {
  name: string
  timestamp: number
  reason?: string
  files: Map<string, string>
  dbState?: PersistedDatabaseSnapshot
  deploymentConfig?: PersistedDeploymentConfig
}

const STATE_VERSION = 1

function getDataRoot(): string {
  const configured = process.env.TORBIT_DATA_DIR
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured)
  }
  return path.join(process.cwd(), '.torbit-data')
}

function sanitizeProjectId(projectId: string): string {
  const trimmed = projectId.trim()
  if (!trimmed) return 'default'
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getProjectStateFile(projectId: string): string {
  const root = getDataRoot()
  const dir = path.join(root, 'projects')
  return path.join(dir, `${sanitizeProjectId(projectId)}.json`)
}

function ensureProjectDirectory(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readProjectState(projectId: string): PersistedProjectState {
  const filePath = getProjectStateFile(projectId)
  if (!fs.existsSync(filePath)) {
    return {
      version: STATE_VERSION,
      updatedAt: new Date().toISOString(),
    }
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PersistedProjectState>
    return {
      version: STATE_VERSION,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      knowledge: parsed.knowledge,
      memoryEvents: Array.isArray(parsed.memoryEvents) ? parsed.memoryEvents : [],
      checkpoints: parsed.checkpoints && typeof parsed.checkpoints === 'object' ? parsed.checkpoints : {},
    }
  } catch {
    return {
      version: STATE_VERSION,
      updatedAt: new Date().toISOString(),
    }
  }
}

function atomicWriteProjectState(projectId: string, state: PersistedProjectState): void {
  const filePath = getProjectStateFile(projectId)
  ensureProjectDirectory(filePath)

  const finalState: PersistedProjectState = {
    version: STATE_VERSION,
    updatedAt: new Date().toISOString(),
    knowledge: state.knowledge,
    memoryEvents: state.memoryEvents || [],
    checkpoints: state.checkpoints || {},
  }

  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(finalState, null, 2)}\n`, 'utf8')
  fs.renameSync(tempPath, filePath)
}

function withProjectState(
  projectId: string,
  updater: (current: PersistedProjectState) => PersistedProjectState
): void {
  const current = readProjectState(projectId)
  const updated = updater(current)
  atomicWriteProjectState(projectId, updated)
}

function toRecord(files: Map<string, string>): Record<string, string> {
  const record: Record<string, string> = {}
  for (const [filePath, content] of files.entries()) {
    record[filePath] = content
  }
  return record
}

function toMap(files: Record<string, string> | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (!files) return map
  for (const [filePath, content] of Object.entries(files)) {
    map.set(filePath, content)
  }
  return map
}

function cloneSerializable<T>(value: T): T {
  if (value === undefined || value === null) return value

  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

export function loadPersistedKnowledge(projectId: string): ProjectKnowledge | null {
  const state = readProjectState(projectId)
  return state.knowledge ?? null
}

export function savePersistedKnowledge(projectId: string, knowledge: ProjectKnowledge): void {
  withProjectState(projectId, (current) => ({
    ...current,
    knowledge,
  }))
}

export function loadPersistedMemoryEvents(projectId: string): MemoryLedgerEvent[] {
  const state = readProjectState(projectId)
  return state.memoryEvents || []
}

export function appendPersistedMemoryEvent(projectId: string, event: MemoryLedgerEvent): void {
  withProjectState(projectId, (current) => ({
    ...current,
    memoryEvents: [...(current.memoryEvents || []), event],
  }))
}

export function loadPersistedCheckpoints(projectId: string): Map<string, RuntimeCheckpoint> {
  const state = readProjectState(projectId)
  const checkpoints = new Map<string, RuntimeCheckpoint>()

  const rawCheckpoints = state.checkpoints || {}
  for (const [checkpointId, checkpoint] of Object.entries(rawCheckpoints)) {
    checkpoints.set(checkpointId, {
      name: checkpoint.name,
      timestamp: checkpoint.timestamp,
      reason: checkpoint.reason,
      files: toMap(checkpoint.files),
      dbState: checkpoint.dbState ? cloneSerializable(checkpoint.dbState) : undefined,
      deploymentConfig: checkpoint.deploymentConfig ? cloneSerializable(checkpoint.deploymentConfig) : undefined,
    })
  }

  return checkpoints
}

export function savePersistedCheckpoint(
  projectId: string,
  checkpointId: string,
  checkpoint: RuntimeCheckpoint
): void {
  withProjectState(projectId, (current) => ({
    ...current,
    checkpoints: {
      ...(current.checkpoints || {}),
      [checkpointId]: {
        name: checkpoint.name,
        timestamp: checkpoint.timestamp,
        reason: checkpoint.reason,
        files: toRecord(checkpoint.files),
        dbState: checkpoint.dbState ? cloneSerializable(checkpoint.dbState) : undefined,
        deploymentConfig: checkpoint.deploymentConfig ? cloneSerializable(checkpoint.deploymentConfig) : undefined,
      },
    },
  }))
}

export function saveAllPersistedCheckpoints(
  projectId: string,
  checkpoints: Map<string, RuntimeCheckpoint>
): void {
  const serialized: Record<string, PersistedCheckpoint> = {}
  for (const [checkpointId, checkpoint] of checkpoints.entries()) {
    serialized[checkpointId] = {
      name: checkpoint.name,
      timestamp: checkpoint.timestamp,
      reason: checkpoint.reason,
      files: toRecord(checkpoint.files),
      dbState: checkpoint.dbState ? cloneSerializable(checkpoint.dbState) : undefined,
      deploymentConfig: checkpoint.deploymentConfig ? cloneSerializable(checkpoint.deploymentConfig) : undefined,
    }
  }

  withProjectState(projectId, (current) => ({
    ...current,
    checkpoints: serialized,
  }))
}

export function getLatestCheckpointId(projectId: string): string | null {
  const checkpoints = loadPersistedCheckpoints(projectId)
  const sorted = Array.from(checkpoints.entries()).sort((a, b) => b[1].timestamp - a[1].timestamp)
  return sorted[0]?.[0] ?? null
}
