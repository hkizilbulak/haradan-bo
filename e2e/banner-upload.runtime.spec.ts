import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required');
  }
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

test('package price remains a raw editing string', async ({ page }) => {
  await login(page);
  await page.goto('/packages');
  await page.getByRole('button', { name: 'Paket Ekle' }).click();
  const panel = page.locator('.offcanvas.show');
  const price = panel.locator('input[placeholder="Örn. 199,90"]');

  await price.fill('');
  await price.type('2');
  await expect(price).toHaveValue('2');
  await price.type('0');
  await expect(price).toHaveValue('20');
  await price.type('0');
  await expect(price).toHaveValue('200');
  await price.press('Backspace');
  await expect(price).toHaveValue('20');
  await price.fill('1.200,50');
  await expect(price).toHaveValue('1.200,50');
  await price.blur();
  await expect(price).toHaveValue('1200,50');
  await price.fill('geçersiz');
  await expect(panel).toContainText('Fiyatı 200,50 veya 1.200,50 biçiminde girin.');
  await expect(panel.locator('input[type="submit"]')).toBeDisabled();
});

test('configured banner upload reaches processed preview and creates banner', async ({ page }) => {
  test.skip(process.env.E2E_REAL_BANNER_UPLOAD !== '1', 'Consumes the explicitly configured TEST provider only when opted in.');
  const phases: string[] = [];
  const browserStorageRequests: string[] = [];
  const existingAssetId = process.env.E2E_EXISTING_BANNER_ASSET_ID;
  if (existingAssetId) {
    await page.route('**/api/bo/media-upload', (route) => route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ assetId: existingAssetId }),
    }));
  }
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.endsWith('/api/bo/media-upload')) {
      phases.push(`relay:${response.status()}`);
    } else if (/\/api\/v1\/admin\/media\/assets\/[^/]+\/confirm$/.test(url.pathname)) {
      phases.push(`confirm:${response.status()}`);
    } else if (/\/api\/v1\/admin\/media\/assets\/[^/]+$/.test(url.pathname)) {
      phases.push(`status:${response.status()}`);
    } else if (response.request().method() === 'PUT' && url.hostname.includes('backblazeb2.com')) {
      phases.push(`storage-put:${response.status()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'PUT') {
      browserStorageRequests.push(`${url.hostname}:${request.failure()?.errorText ?? 'unknown'}`);
    }
  });

  await login(page);
  await page.goto('/banners');
  await page.getByRole('button', { name: 'Banner Ekle' }).click();
  const panel = page.locator('.offcanvas.show');
  await panel.locator('input[type="file"]').setInputFiles('public/images/slide-img/slider-img-1.jpg');
  await expect(page.getByText('Görsel yüklendi')).toBeVisible({ timeout: 40_000 });
  await expect(panel.locator('img[alt="Banner önizleme"]')).toBeVisible();
  await expect.poll(() => panel.locator('img[alt="Banner önizleme"]').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const title = `Manuel QA Banner ${Date.now()}`;
  await panel.locator('input[name="title"]').fill(title);
  await panel.locator('input[name="altText"]').fill('Manuel QA banner önizlemesi');
  const createResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/admin/banners'));
  await panel.locator('input[type="submit"]').click();
  expect((await createResponse).status()).toBe(201);
  await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();

  console.log(`banner-runtime-phases=${phases.join(',')}`);
  expect(browserStorageRequests).toEqual([]);
});

test('TJK page distinguishes automatic status, manual action and history', async ({ page }) => {
  await login(page);
  await page.goto('/tjk');
  await expect(page.getByRole('heading', { name: 'TJK Senkronizasyonu' })).toBeVisible();
  const automatic = page.locator('.card').filter({ hasText: 'Otomatik Senkronizasyon' });
  await expect(automatic).toContainText('Pasif');
  await expect(automatic).toContainText('Salı, Perşembe, Cumartesi 00:10');
  await expect(automatic).toContainText('Tam Senkronizasyon');
  await expect(page.getByRole('button', { name: 'Şimdi Senkronize Et' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Senkronizasyon Geçmişi' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Başlatılma Şekli' })).toBeVisible();
  await expect(page.locator('tbody')).toContainText(/Manuel|Otomatik/);

  await page.getByRole('button', { name: 'Şimdi Senkronize Et' }).click();
  const panel = page.locator('.offcanvas.show');
  await expect(panel).toContainText('Tam Senkronizasyon');
  await panel.locator('summary').click();
  await expect(panel).toContainText('Mevcut işleyiş değişiklik penceresi kullanmaz');
  await expect(panel).toContainText('Kayıtları Yeniden Eşleştirme');
});
