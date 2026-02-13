/**
 * E2E Test Helpers and Fixtures
 * Provides utilities for authentication, API mocking, and common test operations
 */

import { test as base, expect, Page } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

/**
 * Extended test fixture with common utilities
 */
export const test = base.extend<{
  authenticatedPage: Page
  mockApi: MockApiHelper
  testData: TestDataHelper
}>({
  authenticatedPage: async ({ page, context }, use) => {
    // Setup authentication for E2E tests
    await setupAuth(page, context)
    await use(page)
    await page.close()
  },

  mockApi: async ({ page }, use) => {
    const helper = new MockApiHelper(page)
    await use(helper)
  },

  testData: async ({}, use) => {
    const helper = new TestDataHelper()
    await use(helper)
  },
})

/**
 * Setup authentication for E2E tests
 */
async function setupAuth(page: Page, context: BrowserContext) {
  const authToken = process.env.E2E_AUTH_TOKEN
  const userId = process.env.E2E_USER_ID || 'e2e-test-user'

  if (authToken) {
    // Set auth cookie if token provided
    await context.addCookies([
      {
        name: 'auth-token',
        value: authToken,
        domain: new URL(page.context().baseURL || '').hostname,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ])
  }

  // Store user ID in localStorage for app
  await page.evaluate((uid) => {
    localStorage.setItem('torbit_e2e_user_id', uid)
  }, userId)
}

/**
 * Helper for mocking API responses in tests
 */
export class MockApiHelper {
  constructor(private page: Page) {}

  /**
   * Mock streaming chat response
   */
  async mockChatStream(
    chunks: any[],
    options: { statusCode?: number; delay?: number } = {}
  ) {
    const { statusCode = 200, delay = 100 } = options

    await this.page.route('/api/chat', async (route) => {
      const response = route.request()

      if (response.method() === 'POST') {
        // Send SSE stream
        const body = await route.request().postDataJSON()

        const sseChunks = chunks
          .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
          .join('')

        await route.abort('blockedbyresponse')

        // Create response with streaming body
        await route.continue({
          status: statusCode,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
          body: sseChunks,
        })
      } else {
        await route.continue()
      }
    })
  }

  /**
   * Mock execution API
   */
  async mockExecutionAPI(
    result: any,
    options: { statusCode?: number; delay?: number } = {}
  ) {
    const { statusCode = 200, delay = 500 } = options

    await this.page.route('/api/execute', async (route) => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      await route.abort('blockedbyresponse')
      await route.continue({
        status: statusCode,
        body: JSON.stringify(result),
      })
    })
  }

  /**
   * Mock analytics API
   */
  async mockAnalyticsAPI() {
    await this.page.route('/api/analytics/**', async (route) => {
      await route.abort('blockedbyresponse')
      await route.continue({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    })
  }

  /**
   * Track API calls
   */
  async trackApiCalls(
    pattern: string
  ): Promise<{ method: string; body?: any; headers?: any }[]> {
    const calls: any[] = []

    await this.page.on('request', (request) => {
      if (request.url().includes(pattern)) {
        calls.push({
          method: request.method(),
          body: request.postDataJSON?.(),
          headers: request.headers(),
        })
      }
    })

    return calls
  }

  /**
   * Wait for API call
   */
  async waitForApiCall(
    pattern: string,
    timeout: number = 10000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`API call ${pattern} not received within ${timeout}ms`)),
        timeout
      )

      const handler = (request: any) => {
        if (request.url().includes(pattern)) {
          this.page.off('request', handler)
          clearTimeout(timeoutId)
          resolve(request)
        }
      }

      this.page.on('request', handler)
    })
  }
}

/**
 * Helper for test data generation
 */
export class TestDataHelper {
  /**
   * Generate test execution
   */
  generateExecution(overrides?: Partial<any>): any {
    return {
      runId: `run-test-${Date.now()}`,
      projectId: 'test-project',
      userId: 'e2e-test-user',
      agentId: 'test-agent',
      intent: 'Test execution',
      input: { test: true },
      status: 'success',
      result: { output: 'Test result' },
      metrics: {
        cost: 100,
        duration: 1000,
        tokensUsed: 500,
        toolCalls: 2,
      },
      ...overrides,
    }
  }

  /**
   * Generate test stream chunks
   */
  generateStreamChunks(messageContent: string, toolCalls: any[] = []): any[] {
    return [
      {
        type: 'status',
        data: { status: 'Thinking' },
      },
      ...toolCalls.map((tc) => ({
        type: 'tool_call',
        data: tc,
      })),
      {
        type: 'content',
        data: { content: messageContent, role: 'assistant' },
      },
      {
        type: 'status',
        data: { status: 'Complete' },
      },
    ]
  }

  /**
   * Generate test message
   */
  generateMessage(content: string, role: 'user' | 'assistant' = 'assistant'): any {
    return {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: Date.now(),
    }
  }

  /**
   * Generate test tool call
   */
  generateToolCall(
    name: string = 'test_tool',
    args: any = {},
    overrides?: Partial<any>
  ): any {
    return {
      id: `tc-${Date.now()}`,
      name,
      args,
      status: 'complete',
      result: { success: true },
      ...overrides,
    }
  }
}

/**
 * Common assertions
 */
export async function expectExecutionSuccess(
  page: Page,
  runId: string,
  timeout: number = 10000
) {
  const status = page.locator(`[data-testid="status"][data-run-id="${runId}"]`)
  await expect(status).toContainText('success', { timeout })
}

export async function expectStreamingComplete(
  page: Page,
  timeout: number = 10000
) {
  const indicator = page.locator('[data-testid="streaming-indicator"]')
  await expect(indicator).not.toBeVisible({ timeout })
}

export async function expectMetricsRecorded(
  page: Page,
  metrics: Partial<any> = {}
) {
  if (metrics.cost !== undefined) {
    const cost = page.locator('[data-testid="metric-cost"]')
    await expect(cost).toContainText(metrics.cost.toString())
  }

  if (metrics.duration !== undefined) {
    const duration = page.locator('[data-testid="metric-duration"]')
    await expect(duration).toContainText(metrics.duration.toString())
  }

  if (metrics.tokens !== undefined) {
    const tokens = page.locator('[data-testid="metric-tokens"]')
    await expect(tokens).toContainText(metrics.tokens.toString())
  }
}

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for condition with timeout
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 10000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
    throw new Error(`Condition not met within ${timeout}ms`)
  },

  /**
   * Generate unique test ID
   */
  generateTestId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  },

  /**
   * Parse SSE stream
   */
  parseSSEStream(stream: string): any[] {
    return stream
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => {
        try {
          return JSON.parse(line.slice(6))
        } catch {
          return null
        }
      })
      .filter(Boolean)
  },
}

/**
 * Re-export expect for convenience
 */
export { expect }
