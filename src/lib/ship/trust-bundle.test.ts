import { describe, expect, it } from 'vitest'
import {
  appendTrustBundleArtifacts,
  createShipTrustBundle,
  evaluateReleaseReadiness,
  normalizeShipPath,
  signShipTrustBundle,
} from './trust-bundle'

describe('trust-bundle', () => {
  it('normalizes ship paths', () => {
    expect(normalizeShipPath('/src\\app//page.tsx')).toBe('src/app/page.tsx')
  })

  it('reports blockers for unverified governance', () => {
    const readiness = evaluateReleaseReadiness({
      auditorPassed: false,
      previewVerified: false,
      runtimeProbePassed: false,
      rescueCount: 0,
      requiresHumanReview: true,
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.blockers.length).toBeGreaterThanOrEqual(3)
  })

  it('creates bundle and attaches trust files', () => {
    const bundle = createShipTrustBundle({
      projectName: 'Test Project',
      target: 'github',
      workflowMode: 'pr-first',
      actorUserId: 'user-1',
      governance: {
        auditorPassed: true,
        previewVerified: true,
        runtimeProbePassed: true,
        runtimeHash: 'runtime-hash',
        dependencyLockHash: 'lock-hash',
        rescueCount: 0,
        requiresHumanReview: false,
      },
      files: [
        { path: 'src/app/page.tsx', content: 'export default function Page(){return null}' },
      ],
    })

    expect(bundle.fileManifest).toHaveLength(1)
    expect(bundle.readiness.ready).toBe(true)

    const signed = signShipTrustBundle(bundle, 'secret-key', 'test-key')
    expect(signed.signature?.keyId).toBe('test-key')

    const filesWithTrust = appendTrustBundleArtifacts(
      [{ path: 'src/app/page.tsx', content: 'export default function Page(){return null}' }],
      signed
    )

    expect(filesWithTrust.some((file) => file.path === '.torbit/TRUST_BUNDLE.json')).toBe(true)
    expect(filesWithTrust.some((file) => file.path === '.torbit/TRUST_FILE_MANIFEST.json')).toBe(true)
    expect(filesWithTrust.some((file) => file.path === '.torbit/SHIP_CHECKLIST.md')).toBe(true)
  })
})
