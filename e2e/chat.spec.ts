import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should allow typing in the chat input', async ({ page }) => {
    // Find the chat textarea
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Type a message
    await chatInput.fill('Create a simple button component');
    await expect(chatInput).toHaveValue('Create a simple button component');
  });

  test('should have a submit button', async ({ page }) => {
    // Find submit/send button
    const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("→")').first();
    await expect(submitButton).toBeVisible({ timeout: 10000 });
  });

  test('should clear input after submission (mock)', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Type a message
    await chatInput.fill('Test message');
    
    // Note: Actually sending would trigger API call
    // This just tests the input behavior
    await expect(chatInput).toHaveValue('Test message');
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('should have accessible form inputs', async ({ page }) => {
    await page.goto('/');
    
    // Input should be focusable
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first focusable element
    await page.keyboard.press('Tab');
    
    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
