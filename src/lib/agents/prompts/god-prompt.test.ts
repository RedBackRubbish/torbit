import { describe, it, expect } from 'vitest'
import { GOD_PROMPT, GOD_PROMPT_COMPACT, GOD_PROMPT_ENV } from './god-prompt'

describe('God Prompt', () => {
  it('is defined and reasonably sized', () => {
    expect(GOD_PROMPT).toBeDefined()
    expect(GOD_PROMPT.length).toBeGreaterThan(900)
    expect(GOD_PROMPT.length).toBeLessThan(8000)
  })

  it('enforces the required communication flow', () => {
    expect(GOD_PROMPT).toContain('Step 1: Acknowledge')
    expect(GOD_PROMPT).toContain('Step 2: Plan')
    expect(GOD_PROMPT).toContain('Step 3: Build')
    expect(GOD_PROMPT).toContain('Step 4: Verify')
    expect(GOD_PROMPT).toContain('Step 5: Summary')
  })

  it('requires structured status sections in replies', () => {
    expect(GOD_PROMPT).toContain('Goal')
    expect(GOD_PROMPT).toContain('What changed')
    expect(GOD_PROMPT).toContain('What passed')
    expect(GOD_PROMPT).toContain('What failed')
    expect(GOD_PROMPT).toContain('Auto-retry done?')
    expect(GOD_PROMPT).toContain('Next action')
  })

  it('contains Next.js stack invariants', () => {
    expect(GOD_PROMPT).toContain('Next.js 16 App Router')
    expect(GOD_PROMPT).toContain('React 19 + TypeScript')
    expect(GOD_PROMPT).toContain('src/app/api')
  })

  it('lists the core mutation tools', () => {
    expect(GOD_PROMPT).toContain('createFile')
    expect(GOD_PROMPT).toContain('editFile')
    expect(GOD_PROMPT).toContain('applyPatch')
    expect(GOD_PROMPT).toContain('runTests')
  })

  it('forbids confirmation-gating implementation work', () => {
    expect(GOD_PROMPT).toContain('NEVER ask the user to reply "go"')
  })

  it('keeps compact prompt alias stable', () => {
    expect(GOD_PROMPT_COMPACT).toBe(GOD_PROMPT)
  })

  it('exports env-safe prompt variant', () => {
    expect(GOD_PROMPT_ENV).toContain('\\n')
    expect(GOD_PROMPT_ENV).not.toContain('`')
  })
})
