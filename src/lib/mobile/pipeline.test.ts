import { describe, expect, it } from 'vitest'
import {
  buildMobilePipelinePlan,
  getDefaultSubmitProfile,
  mergeEasJson,
  normalizeMobileFilePath,
} from './pipeline'

describe('mobile pipeline helpers', () => {
  it('normalizes valid paths and blocks traversal', () => {
    expect(normalizeMobileFilePath('/app/config.ts')).toBe('app/config.ts')
    expect(() => normalizeMobileFilePath('../secrets.txt')).toThrow('Invalid file path')
  })

  it('chooses default submit profiles by action', () => {
    expect(getDefaultSubmitProfile('testflight', 'internal')).toBe('testflight')
    expect(getDefaultSubmitProfile('appstore-connect', 'internal')).toBe('appstore')
    expect(getDefaultSubmitProfile('android', 'beta')).toBe('android-beta')
  })

  it('builds testflight queue command with auto submit profile', () => {
    const plan = buildMobilePipelinePlan({
      action: 'testflight',
      buildProfile: 'production',
      submitProfile: 'testflight',
      wait: false,
      track: 'internal',
    })

    expect(plan.command).toBe('build')
    expect(plan.args).toContain('--platform')
    expect(plan.args).toContain('ios')
    expect(plan.args).toContain('--auto-submit-with-profile')
    expect(plan.args).toContain('testflight')
    expect(plan.args).toContain('--no-wait')
  })

  it('builds app store connect queue command', () => {
    const plan = buildMobilePipelinePlan({
      action: 'appstore-connect',
      buildProfile: 'production',
      submitProfile: 'appstore',
      wait: false,
      track: 'internal',
    })

    expect(plan.command).toBe('build')
    expect(plan.args).toContain('--platform')
    expect(plan.args).toContain('ios')
    expect(plan.args).toContain('--auto-submit-with-profile')
    expect(plan.args).toContain('appstore')
  })

  it('merges eas config and injects android track profile', () => {
    const mergedRaw = mergeEasJson(null, {
      action: 'android',
      buildProfile: 'production',
      submitProfile: 'android-internal',
      track: 'internal',
    })

    const merged = JSON.parse(mergedRaw) as {
      submit?: Record<string, { android?: { track?: string } }>
      build?: Record<string, unknown>
    }

    expect(merged.build?.production).toBeTruthy()
    expect(merged.submit?.['android-internal']?.android?.track).toBe('internal')
  })
})
