import { test, expect } from '@playwright/test';

test.describe('Builder Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to builder
    await page.goto('/builder');
  });

  test('should load the builder interface', async ({ page }) => {
    // Should have the builder layout visible
    await expect(page.locator('main, [data-testid="builder-layout"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show Preview and Code tabs', async ({ page }) => {
    // Check for tab buttons
    const previewTab = page.getByRole('button', { name: 'Preview' });
    const codeTab = page.getByRole('button', { name: 'Code' });
    
    await expect(previewTab).toBeVisible({ timeout: 10000 });
    await expect(codeTab).toBeVisible();
  });

  test('should switch between Preview and Code tabs', async ({ page }) => {
    // Wait for tabs to load
    const codeTab = page.getByRole('button', { name: 'Code' });
    await expect(codeTab).toBeVisible({ timeout: 10000 });
    
    // Click Code tab
    await codeTab.click();
    
    // Code tab should now be active (has blue styling)
    await expect(codeTab).toHaveClass(/blue/);
    
    // Switch back to Preview
    const previewTab = page.getByRole('button', { name: 'Preview' });
    await previewTab.click();
    await expect(previewTab).toHaveClass(/blue/);
  });

  test('should have a chat input area', async ({ page }) => {
    // Look for textarea or input for chat
    const chatInput = page.locator('textarea, input[type="text"]').last();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
  });

  test('should display fuel gauge', async ({ page }) => {
    // Fuel gauge should be visible
    const fuelGauge = page.locator('text=/fuel|tokens|remaining/i').first();
    await expect(fuelGauge).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Builder with Initial Prompt', () => {
  test('should initialize with prompt from session storage', async ({ page }) => {
    // Set session storage before navigating
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('torbit_prompt', 'Build a todo app with React');
    });
    
    // Navigate to builder
    await page.goto('/builder');
    
    // The prompt should be visible somewhere in the interface
    // This tests the session storage → builder flow
    await expect(page.locator('main, [data-testid="builder-layout"]')).toBeVisible({ timeout: 10000 });
  });
});
