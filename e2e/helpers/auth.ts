import type { Page } from '@playwright/test'

export async function enableTestAuth(page: Page) {
  await page.context().addCookies([
    {
      name: 'torbit_e2e_auth',
      value: '1',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}
