import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E testing
 * Supports multiple environments: local, staging, production
 * @see https://playwright.dev/docs/test-configuration
 */

const ENVIRONMENT = process.env.PLAYWRIGHT_ENV || 'local'
const IS_STAGING = ENVIRONMENT === 'staging'
const IS_PRODUCTION = ENVIRONMENT === 'production'
const IS_LOCAL = ENVIRONMENT === 'local'

// Environment-specific URLs
const BASE_URLS: Record<string, string> = {
  local: 'http://127.0.0.1:3100',
  staging: process.env.STAGING_URL || 'https://staging.torbit.dev',
  production: process.env.PRODUCTION_URL || 'https://torbit.dev',
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || BASE_URLS[ENVIRONMENT]

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : IS_LOCAL ? 0 : 1,
  workers: process.env.CI ? 1 : IS_LOCAL ? undefined : 2,
  timeout: IS_STAGING || IS_PRODUCTION ? 60000 : 30000,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL,
    trace: IS_PRODUCTION ? 'off' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: IS_LOCAL ? 'off' : 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000,
    // Headless mode for CI, headed for local development
    headless: IS_LOCAL ? false : true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Also test on Firefox for staging/prod
    ...(IS_STAGING || IS_PRODUCTION
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
        ]
      : []),
  ],
  webServer:
    IS_LOCAL && !process.env.PLAYWRIGHT_BASE_URL
      ? {
          command: 'rm -rf .next && npm run dev -- --port 3100 --webpack',
          url: 'http://127.0.0.1:3100',
          // Always use the project server to avoid false positives from unrelated local apps.
          reuseExistingServer: false,
          timeout: 120 * 1000,
          env: {
            TORBIT_E2E_AUTH: 'true',
            NEXT_PUBLIC_E2E_AUTH: 'true',
          },
        }
      : undefined,
})
