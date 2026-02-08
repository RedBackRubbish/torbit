import { afterEach, describe, expect, it } from 'vitest'
import { getMobilePipelineDiagnostics } from './ship-executor'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('getMobilePipelineDiagnostics', () => {
  it('reports missing credentials when unset', () => {
    delete process.env.EXPO_TOKEN
    delete process.env.APPLE_APP_SPECIFIC_PASSWORD
    delete process.env.EXPO_APPLE_APP_SPECIFIC_PASSWORD
    delete process.env.ASC_API_KEY_PATH
    delete process.env.ASC_API_KEY_ID
    delete process.env.ASC_API_KEY_ISSUER_ID
    delete process.env.EXPO_ASC_API_KEY_PATH
    delete process.env.EXPO_ASC_API_KEY_ID
    delete process.env.EXPO_ASC_API_KEY_ISSUER_ID
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
    delete process.env.EXPO_ANDROID_SERVICE_ACCOUNT_KEY_PATH

    const diagnostics = getMobilePipelineDiagnostics()

    expect(diagnostics.expoTokenConfigured).toBe(false)
    expect(diagnostics.iosSubmitAuthConfigured).toBe(false)
    expect(diagnostics.googleServiceAccountConfigured).toBe(false)
    expect(diagnostics.warnings.length).toBeGreaterThan(0)
  })

  it('detects configured auth paths', () => {
    process.env.EXPO_TOKEN = 'token'
    process.env.ASC_API_KEY_PATH = '/tmp/auth-key.p8'
    process.env.ASC_API_KEY_ID = 'KEYID12345'
    process.env.ASC_API_KEY_ISSUER_ID = 'issuer-id'
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '/tmp/google-service-account.json'

    const diagnostics = getMobilePipelineDiagnostics()

    expect(diagnostics.expoTokenConfigured).toBe(true)
    expect(diagnostics.iosSubmitAuthConfigured).toBe(true)
    expect(diagnostics.googleServiceAccountConfigured).toBe(true)
  })
})
