import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the hero section with TORBIT branding', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Torbit/i);
    
    // Check for main hero content
    const heroContent = page.locator('main');
    await expect(heroContent).toBeVisible();
    
    // Check for the TORBIT logo/text
    await expect(page.getByText('TORBIT')).toBeVisible();
  });

  test('should have a working prompt input field', async ({ page }) => {
    // Find the input field
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    
    // Type a prompt
    await input.fill('Build me a todo app');
    await expect(input).toHaveValue('Build me a todo app');
  });

  test('should navigate to builder when submitting a prompt', async ({ page }) => {
    // Find and fill the input
    const input = page.locator('input[type="text"]').first();
    await input.fill('Build me a todo app');
    
    // Submit the form
    await page.keyboard.press('Enter');
    
    // Should navigate to builder
    await expect(page).toHaveURL('/builder');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Content should still be visible
    await expect(page.getByText('TORBIT')).toBeVisible();
  });
});
