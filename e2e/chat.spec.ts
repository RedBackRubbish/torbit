import { test, expect, Page } from '@playwright/test';

async function enableTestAuth(page: Page) {
  await page.context().addCookies([
    {
      name: 'sb-test-auth-token',
      value: 'test-value',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await enableTestAuth(page);
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
  });

  test('should allow typing in the chat input', async ({ page }) => {
    const chatInput = page.getByRole('textbox', {
      name: 'Describe what you want Torbit to produce',
    });
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    await chatInput.fill('Create a simple button component');
    await expect(chatInput).toHaveValue('Create a simple button component');
  });

  test('should have a submit button', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 10000 });
  });

  test('should keep input text before submission', async ({ page }) => {
    const chatInput = page.getByRole('textbox', {
      name: 'Describe what you want Torbit to produce',
    });
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    await chatInput.fill('Test message');
    await expect(chatInput).toHaveValue('Test message');
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('should have accessible form inputs', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
