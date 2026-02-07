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

test.describe('Builder Page', () => {
  test.beforeEach(async ({ page }) => {
    await enableTestAuth(page);
    await page.goto('/builder');
  });

  test('should load the builder interface', async ({ page }) => {
    await expect(page.getByTestId('builder-layout')).toBeVisible({ timeout: 10000 });
  });

  test('should show Preview and Code tabs', async ({ page }) => {
    const previewTab = page.getByRole('button', { name: 'Preview' });
    const codeTab = page.getByRole('button', { name: 'Code' });

    await expect(previewTab).toBeVisible({ timeout: 10000 });
    await expect(codeTab).toBeVisible();
  });

  test('should switch between Preview and Code tabs', async ({ page }) => {
    const codeTab = page.getByRole('button', { name: 'Code' });
    const previewTab = page.getByRole('button', { name: 'Preview' });

    await expect(codeTab).toBeVisible({ timeout: 10000 });

    await codeTab.click();
    await expect(codeTab).toHaveAttribute('aria-pressed', 'true');
    await expect(previewTab).toHaveAttribute('aria-pressed', 'false');

    await previewTab.click();
    await expect(previewTab).toHaveAttribute('aria-pressed', 'true');
    await expect(codeTab).toHaveAttribute('aria-pressed', 'false');
  });

  test('should have a chat input area', async ({ page }) => {
    const chatInput = page.getByRole('textbox', {
      name: 'Describe what you want Torbit to produce',
    });
    await expect(chatInput).toBeVisible({ timeout: 10000 });
  });

  test('should display fuel gauge', async ({ page }) => {
    await expect(page.getByTestId('fuel-gauge')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Builder with Initial Prompt', () => {
  test('should initialize with prompt from session storage', async ({ page }) => {
    await enableTestAuth(page);
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('torbit_prompt', 'Build a todo app with React');
    });

    await page.goto('/builder');
    await expect(page.getByTestId('builder-layout')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// REGRESSION TESTS: WebContainer + Next.js Compatibility
// ============================================================================
// These tests ensure the Next.js version and TypeScript fixes don't regress.
// Context: Next.js 15+/16+ crash in WebContainer, so we must use 14.2.x.
// TypeScript must be enforced structurally, not just in prompts.

test.describe('WebContainer TypeScript Enforcement', () => {
  test.skip('generated project uses TypeScript files', async ({ page }) => {
    // This test requires a full generation cycle - skip in CI unless explicitly enabled
    // To run: ENABLE_GENERATION_TESTS=1 pnpm test:e2e

    if (!process.env.ENABLE_GENERATION_TESTS) {
      test.skip();
      return;
    }

    await enableTestAuth(page);
    await page.goto('/builder');

    // Wait for builder to be ready
    await expect(page.getByTestId('builder-layout')).toBeVisible({ timeout: 10000 });

    // Submit a simple generation prompt
    const chatInput = page.getByRole('textbox', {
      name: 'Describe what you want Torbit to produce',
    });
    await chatInput.fill('Create a simple counter app');
    await chatInput.press('Enter');

    // Wait for generation to complete (files appear in sidebar)
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 120000 });

    // Get list of generated files
    const fileTree = await page.locator('[data-testid="file-tree"]').textContent();

    // Assert: No .js or .jsx files (except config files)
    const jsFilePattern = /(?<!config)\.(js|jsx)(?!on)/gi;
    const hasJsFiles = jsFilePattern.test(fileTree || '');
    expect(hasJsFiles).toBe(false);

    // Assert: Has TypeScript files
    expect(fileTree).toMatch(/\.tsx/);

    // Assert: Has tsconfig.json
    expect(fileTree).toContain('tsconfig.json');

    // Assert: Has package.json with Next.js 14.2.x
    await page.click('text=package.json');
    const codeEditor = page.locator('[data-testid="code-editor"]');
    const packageContent = await codeEditor.textContent();
    expect(packageContent).toContain('14.2.');

    // Assert: Preview loads without rebuild loop
    await page.waitForSelector('iframe[src*="webcontainer"]', { timeout: 180000 });

    // Wait 10 seconds and ensure it's still the same iframe (no rebuild)
    const initialSrc = await page.locator('iframe').first().getAttribute('src');
    await page.waitForTimeout(10000);
    const finalSrc = await page.locator('iframe').first().getAttribute('src');
    expect(finalSrc).toBe(initialSrc);
  });
});
