import { expect, test } from '@playwright/test';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

test('login keeps a credentialed session without CORS or network errors', async ({ page }) => {
  const email = required('E2E_ADMIN_EMAIL');
  const password = required('E2E_ADMIN_PASSWORD');
  const proxyOrigin = process.env.E2E_PROXY_ORIGIN || '';
  const transportErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && /cors|network error|axioserror/i.test(message.text())) {
      transportErrors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    if (/cors|network error|axioserror/i.test(error.message)) {
      transportErrors.push(`page: ${error.message}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) {
      transportErrors.push(`request: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
    }
  });

  const initialSessionResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/session',
  );
  await page.goto('/login');
  expect([200, 401]).toContain((await initialSessionResponse).status());

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/session/login',
  );
  await page.locator('input[type="submit"]').click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Haradan.com BO')).toBeVisible();

  const session = await page.evaluate(async (origin) => {
    const response = await fetch(`${origin}/api/session`, { credentials: 'include' });
    return { status: response.status, body: await response.json() };
  }, proxyOrigin) as { status: number; body: { user?: { email?: string } } };
  expect(session.status).toBe(200);
  expect(session.body.user?.email).toBe(email);

  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Kullanıcılar', exact: true })).toBeVisible();
  expect(transportErrors).toEqual([]);
});
