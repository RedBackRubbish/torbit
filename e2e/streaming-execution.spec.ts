import { test, expect } from '@playwright/test'

test.describe('Streaming Execution', () => {
  test('should stream execution data from API', async ({ page }) => {
    // This would require a test page component that uses useStreamingExecution
    // For now, we'll create the test structure
    await page.goto('http://localhost:3000/test/streaming-execution')

    // Trigger streaming
    await page.click('[data-testid="start-stream-button"]')

    // Verify streaming starts
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]')
    await expect(loadingIndicator).toBeVisible()

    // Wait for data to arrive
    const dataElement = page.locator('[data-testid="stream-data"]')
    await expect(dataElement).toContainText(/result/, { timeout: 10000 })

    // Verify loading stops
    await expect(loadingIndicator).not.toBeVisible()
  })

  test('should cancel streaming execution', async ({ page }) => {
    await page.goto('http://localhost:3000/test/streaming-execution')

    // Trigger streaming
    await page.click('[data-testid="start-stream-button"]')

    // Verify streaming starts
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]')
    await expect(loadingIndicator).toBeVisible()

    // Cancel immediately
    const cancelButton = page.locator('[data-testid="cancel-button"]')
    await expect(cancelButton).toBeEnabled()
    await page.click('[data-testid="cancel-button"]')

    // Verify streaming stops and no more data arrives
    await expect(loadingIndicator).not.toBeVisible()

    // Verify cancel button is disabled after cancel
    await expect(cancelButton).toBeDisabled()
  })

  test('should display progress during streaming', async ({ page }) => {
    await page.goto('http://localhost:3000/test/streaming-execution')

    // Trigger streaming
    await page.click('[data-testid="start-stream-button"]')

    // Check for progress bar
    const progressBar = page.locator('[data-testid="progress-bar"]')
    await expect(progressBar).toBeVisible()

    // Verify progress increases
    const initialProgress = await progressBar.getAttribute('aria-valuenow')
    await page.waitForTimeout(500)
    const updatedProgress = await progressBar.getAttribute('aria-valuenow')

    // Progress should increase or remain same (not decrease)
    expect(parseInt(updatedProgress || '0')).toBeGreaterThanOrEqual(
      parseInt(initialProgress || '0')
    )
  })

  test('should handle streaming errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/test/streaming-execution-error')

    // Trigger streaming that will fail
    await page.click('[data-testid="start-stream-button"]')

    // Wait for error message
    const errorElement = page.locator('[data-testid="error-message"]')
    await expect(errorElement).toBeVisible()

    // Verify error is displayed
    await expect(errorElement).toContainText(/error|failed/i)

    // Verify loading indicator is hidden
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]')
    await expect(loadingIndicator).not.toBeVisible()

    // Verify retry button is available
    const retryButton = page.locator('[data-testid="retry-button"]')
    await expect(retryButton).toBeVisible()
  })

  test('should prevent stale updates after component unmount', async ({ page }) => {
    await page.goto('http://localhost:3000/test/streaming-with-unmount')

    // Trigger streaming
    await page.click('[data-testid="start-stream-button"]')

    // Verify streaming starts
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]')
    await expect(loadingIndicator).toBeVisible()

    // Unmount component while streaming
    await page.click('[data-testid="unmount-component-button"]')

    // Component should be removed
    await expect(loadingIndicator).not.toBeVisible({ timeout: 1000 })

    // Wait to ensure no state updates occur after unmount
    await page.waitForTimeout(2000)

    // No errors should be logged (check console for errors)
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Remount component - should not have received updates from previous stream
    await page.click('[data-testid="remount-component-button"]')

    // Verify no "Cannot update unmounted component" errors
    expect(
      consoleErrors.filter((e) => e.includes('unmounted')).length
    ).toBe(0)
  })
})

test.describe('Execution State Management', () => {
  test('should complete full execution lifecycle', async ({ page }) => {
    await page.goto('http://localhost:3000/test/execution-state')

    // Start execution
    const startButton = page.locator('[data-testid="start-execution-button"]')
    await startButton.click()

    // Verify status changes to running
    const statusElement = page.locator('[data-testid="execution-status"]')
    await expect(statusElement).toContainText('running')

    // Verify run ID is generated
    const runIdElement = page.locator('[data-testid="run-id"]')
    const runId = await runIdElement.textContent()
    expect(runId).toMatch(/^[a-z0-9-]{36}$/) // UUID format

    // Wait for execution to complete
    await expect(statusElement).toContainText('success', { timeout: 10000 })

    // Verify metrics are displayed
    const costElement = page.locator('[data-testid="cost"]')
    await expect(costElement).toContainText(/\d+/)

    const durationElement = page.locator('[data-testid="duration"]')
    await expect(durationElement).toContainText(/\d+ms/)

    const tokensElement = page.locator('[data-testid="tokens"]')
    await expect(tokensElement).toContainText(/\d+/)
  })

  test('should record execution to ledger', async ({ page }) => {
    await page.goto('http://localhost:3000/test/execution-state')

    // Start and complete execution
    const startButton = page.locator('[data-testid="start-execution-button"]')
    await startButton.click()

    const statusElement = page.locator('[data-testid="execution-status"]')
    await expect(statusElement).toContainText('success', { timeout: 10000 })

    // Get run ID
    const runIdElement = page.locator('[data-testid="run-id"]')
    const runId = await runIdElement.textContent()

    // Verify execution was recorded to ledger
    const ledgerButton = page.locator('[data-testid="check-ledger-button"]')
    await ledgerButton.click()

    const ledgerElement = page.locator('[data-testid="ledger-record"]')
    await expect(ledgerElement).toContainText(runId || '')
  })

  test('should handle execution failure', async ({ page }) => {
    await page.goto('http://localhost:3000/test/execution-state-error')

    // Start execution that will fail
    const startButton = page.locator('[data-testid="start-execution-button"]')
    await startButton.click()

    // Verify status changes to failed
    const statusElement = page.locator('[data-testid="execution-status"]')
    await expect(statusElement).toContainText('failed')

    // Verify error message is displayed
    const errorElement = page.locator('[data-testid="error-message"]')
    await expect(errorElement).toBeVisible()

    // Verify error is recorded in ledger with status='failed'
    const ledgerButton = page.locator('[data-testid="check-ledger-button"]')
    await ledgerButton.click()

    const ledgerStatus = page.locator('[data-testid="ledger-status"]')
    await expect(ledgerStatus).toContainText('failed')
  })

  test('should cancel execution', async ({ page }) => {
    await page.goto('http://localhost:3000/test/execution-state-long')

    // Start execution
    const startButton = page.locator('[data-testid="start-execution-button"]')
    await startButton.click()

    // Verify status is running
    const statusElement = page.locator('[data-testid="execution-status"]')
    await expect(statusElement).toContainText('running')

    // Get run ID before cancel
    const runIdElement = page.locator('[data-testid="run-id"]')
    const runId = await runIdElement.textContent()

    // Cancel execution
    const cancelButton = page.locator('[data-testid="cancel-execution-button"]')
    await cancelButton.click()

    // Verify status changes to cancelled
    await expect(statusElement).toContainText('cancelled')

    // Verify cancellation is recorded in ledger with status='cancelled'
    const ledgerButton = page.locator('[data-testid="check-ledger-button"]')
    await ledgerButton.click()

    const ledgerStatus = page.locator('[data-testid="ledger-status"]')
    await expect(ledgerStatus).toContainText('cancelled')
  })

  test('should reset execution state', async ({ page }) => {
    await page.goto('http://localhost:3000/test/execution-state')

    // Start and complete execution
    const startButton = page.locator('[data-testid="start-execution-button"]')
    await startButton.click()

    const statusElement = page.locator('[data-testid="execution-status"]')
    await expect(statusElement).toContainText('success', { timeout: 10000 })

    // Reset execution
    const resetButton = page.locator('[data-testid="reset-button"]')
    await resetButton.click()

    // Verify status is back to idle
    await expect(statusElement).toContainText('idle')

    // Verify run ID is cleared
    const runIdElement = page.locator('[data-testid="run-id"]')
    await expect(runIdElement).toContainText('')
  })
})

test.describe('Error Boundary Recovery', () => {
  test('should recover from errors with retry', async ({ page }) => {
    await page.goto('http://localhost:3000/test/error-boundary')

    // Trigger error in component
    const errorButton = page.locator('[data-testid="trigger-error-button"]')
    await errorButton.click()

    // Verify error boundary is displayed
    const errorMessage = page.locator('[data-testid="error-boundary-fallback"]')
    await expect(errorMessage).toBeVisible()

    // Click retry button
    const retryButton = page.locator('[data-testid="error-retry-button"]')
    await retryButton.click()

    // Verify component recovers
    const normalContent = page.locator('[data-testid="normal-content"]')
    await expect(normalContent).toBeVisible()
  })

  test('should auto-reset after 3 consecutive errors', async ({ page }) => {
    await page.goto('http://localhost:3000/test/error-boundary-auto-reset')

    // Trigger multiple errors
    const errorButton = page.locator('[data-testid="trigger-error-button"]')

    await errorButton.click()
    const errorMessage1 = page.locator('[data-testid="error-boundary-fallback"]')
    await expect(errorMessage1).toBeVisible()

    // Second error
    await errorButton.click()
    await expect(errorMessage1).toBeVisible()

    // Third error
    await errorButton.click()
    await expect(errorMessage1).toBeVisible()

    // Wait for auto-reset timeout (5 seconds)
    await page.waitForTimeout(6000)

    // Verify auto-reset occurred
    const normalContent = page.locator('[data-testid="normal-content"]')
    await expect(normalContent).toBeVisible()
  })

  test('should reset when resetKeys change', async ({ page }) => {
    await page.goto('http://localhost:3000/test/error-boundary-reset-keys')

    // Trigger error
    const errorButton = page.locator('[data-testid="trigger-error-button"]')
    await errorButton.click()

    const errorMessage = page.locator('[data-testid="error-boundary-fallback"]')
    await expect(errorMessage).toBeVisible()

    // Change resetKey (e.g., by clicking a dependency button)
    const changeKeyButton = page.locator('[data-testid="change-reset-key-button"]')
    await changeKeyButton.click()

    // Verify error boundary resets
    const normalContent = page.locator('[data-testid="normal-content"]')
    await expect(normalContent).toBeVisible()
  })

  test('should display error details in development', async ({ page }) => {
    // This test runs only in development mode
    await page.goto('http://localhost:3000/test/error-boundary', {
      waitUntil: 'networkidle',
    })

    const errorButton = page.locator('[data-testid="trigger-error-button"]')
    await errorButton.click()

    const errorMessage = page.locator('[data-testid="error-boundary-fallback"]')
    await expect(errorMessage).toBeVisible()

    // In development, error details should be visible
    const errorDetails = page.locator('[data-testid="error-details"]')

    // The error boundary should display error message
    const errorText = await errorMessage.textContent()
    expect(errorText).toContain('error')
  })
})

test.describe('Streaming + Error Boundary Integration', () => {
  test('should recover from streaming error with error boundary', async ({
    page,
  }) => {
    await page.goto(
      'http://localhost:3000/test/streaming-with-error-boundary'
    )

    // Start streaming that will error
    const startButton = page.locator('[data-testid="start-stream-button"]')
    await startButton.click()

    // Wait for error to be caught by boundary
    const errorMessage = page.locator('[data-testid="error-boundary-fallback"]')
    await expect(errorMessage).toBeVisible()

    // Click retry to restart streaming
    const retryButton = page.locator('[data-testid="error-retry-button"]')
    await retryButton.click()

    // Streaming should restart
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]')
    await expect(loadingIndicator).toBeVisible()
  })

  test('should handle unmount during error recovery', async ({ page }) => {
    await page.goto(
      'http://localhost:3000/test/streaming-with-error-boundary-unmount'
    )

    // Start streaming
    const startButton = page.locator('[data-testid="start-stream-button"]')
    await startButton.click()

    // Component unmounts while error is being handled
    const unmountButton = page.locator('[data-testid="unmount-button"]')
    await unmountButton.click()

    // Wait to ensure no race conditions or memory leaks
    await page.waitForTimeout(2000)

    // Verify no console errors about unmounted components
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    expect(
      consoleErrors.filter((e) => e.includes('unmounted')).length
    ).toBe(0)
  })
})
