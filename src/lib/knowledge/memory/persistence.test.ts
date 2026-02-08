import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('knowledge memory persistence', () => {
  let dataDir: string
  let projectId: string

  beforeEach(() => {
    dataDir = path.join(process.cwd(), '.tmp', `memory-persistence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    process.env.TORBIT_DATA_DIR = dataDir
    fs.rmSync(dataDir, { recursive: true, force: true })
    projectId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    vi.resetModules()
  })

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true })
    delete process.env.TORBIT_DATA_DIR
    vi.resetModules()
  })

  it('persists snapshots across module reloads', async () => {
    const snapshotModule = await import('./snapshot')

    const generated = snapshotModule.generateSnapshot(
      projectId,
      { nextjs: '16', react: '19', typescript: '5' },
      'local'
    )
    snapshotModule.saveSnapshot(projectId, generated)

    vi.resetModules()
    const reloadedSnapshotModule = await import('./snapshot')
    const loaded = reloadedSnapshotModule.getProjectKnowledge(projectId).snapshot

    expect(loaded.snapshotHash).toBe(generated.snapshotHash)
    expect(loaded.frameworks.nextjs).toBe('16')
  })

  it('persists memory events across module reloads', async () => {
    const eventsModule = await import('./events')
    const exportedAt = new Date().toISOString()

    eventsModule.emitMemoryEvent(
      'KNOWLEDGE_EXPORTED',
      projectId,
      {
        projectId,
        exportedAt,
        format: 'json',
        destination: 'unit-test',
      }
    )

    vi.resetModules()
    const reloadedEventsModule = await import('./events')
    const loaded = reloadedEventsModule.getMemoryEvents(projectId)

    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.type).toBe('KNOWLEDGE_EXPORTED')
  })
})
