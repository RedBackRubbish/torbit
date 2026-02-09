import { describe, expect, it } from 'vitest'
import { ExecutorService } from './executor'

describe('ExecutorService tool contract', () => {
  it('exposes applyPatch as an executable tool', () => {
    expect(ExecutorService.isToolAvailable('applyPatch')).toBe(true)
  })

  it('returns false for unknown tools', () => {
    expect(ExecutorService.isToolAvailable('nonExistentTool')).toBe(false)
  })
})
