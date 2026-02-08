import { describe, expect, it } from 'vitest'
import { generateSnapshot, verifySnapshotIntegrity } from './snapshot'

describe('knowledge snapshot integrity', () => {
  it('generates deterministic SHA-256 snapshot hashes', () => {
    const frameworks = { nextjs: '16', react: '19', typescript: '5' }
    const snapshot = generateSnapshot('project-1', frameworks, 'production')

    expect(snapshot.snapshotHash.startsWith('snap-sha256-')).toBe(true)
    expect(snapshot.snapshotHash.length).toBeGreaterThan(20)
  })

  it('verifies snapshot integrity and detects tampering', () => {
    const snapshot = generateSnapshot('project-2', { nextjs: '16' }, 'staging')

    expect(verifySnapshotIntegrity(snapshot)).toBe(true)

    const tampered = {
      ...snapshot,
      frameworks: {
        ...snapshot.frameworks,
        nextjs: '17',
      },
    }

    expect(verifySnapshotIntegrity(tampered)).toBe(false)
  })
})
