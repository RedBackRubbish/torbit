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

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await enableTestAuth(page);
    await page.goto('/');
  });

  test('should display the hero section with TORBIT branding', async ({ page }) => {
    await expect(page).toHaveTitle(/Torbit/i);

    const heroContent = page.locator('main');
    await expect(heroContent).toBeVisible();

    await expect(page.getByText('TORBIT', { exact: true }).first()).toBeVisible();
  });

  test('should have a working prompt input field', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();

    await input.fill('Build me a todo app');
    await expect(input).toHaveValue('Build me a todo app');
  });

  test('should navigate to builder when submitting a prompt', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('Build me a todo app');

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL('/builder');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByText('TORBIT', { exact: true }).first()).toBeVisible();
  });
});
