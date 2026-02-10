import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runVibeAutofix } from './vibe-autofix'
import type { VibeAuditReport } from './vibe-audit'

const tempDirs: string[] = []

async function createTempDir(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'torbit-vibe-autofix-'))
  tempDirs.push(tempDir)
  return tempDir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

function makeReport(overrides: Partial<VibeAuditReport>): VibeAuditReport {
  return {
    findings: [],
    proof: [],
    guardrailPrompt: '',
    ...overrides,
  }
}

describe('runVibeAutofix', () => {
  it('creates missing resilience/legal routes', async () => {
    const projectRoot = await createTempDir()
    const report = makeReport({
      findings: [
        { id: 'resilience', status: 'warning', label: 'res', detail: 'missing loading', remediation: 'add loading' },
        { id: 'legal', status: 'warning', label: 'legal', detail: 'missing legal pages', remediation: 'add pages' },
      ],
    })

    const result = await runVibeAutofix(projectRoot, report)

    expect(result.applied).toContain('Added src/app/loading.tsx')
    expect(result.applied).toContain('Added src/app/not-found.tsx')
    expect(result.applied).toContain('Added src/app/privacy/page.tsx')
    expect(result.applied).toContain('Added src/app/terms/page.tsx')
    await expect(fs.access(path.join(projectRoot, 'src/app/loading.tsx'))).resolves.toBeUndefined()
  })
})
