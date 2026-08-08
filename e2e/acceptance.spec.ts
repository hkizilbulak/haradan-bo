import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const runId = required('E2E_RUN_ID');
const adminEmail = required('E2E_ADMIN_EMAIL');
const adminPassword = required('E2E_ADMIN_PASSWORD');
const createdAdminEmail = required('E2E_CREATED_ADMIN_EMAIL');
const categoryA = required('E2E_CATEGORY_A');
const categoryB = required('E2E_CATEGORY_B');
const packageA = required('E2E_PACKAGE_A');
const packageB = required('E2E_PACKAGE_B');
const campaignName = required('E2E_CAMPAIGN');
const bannerTitle = required('E2E_BANNER_TITLE');
const bannerAssetId = required('E2E_BANNER_ASSET_ID');

const forbiddenProductText = /expectedVersion|sortOrder|provider.?id|asset.?id|environment variable|AUTH_JWT_SECRET|DATABASE_URL|TINIFY_|B2_|RESEND_|\bworker\b|\bkuyruk(?:ta|tan|a)?\b/i;

async function assertNoTechnicalLeaks(scope: Page | Locator) {
  const text = 'url' in scope
    ? await (scope as Page).locator('body').innerText()
    : await (scope as Locator).innerText();
  expect(text).not.toMatch(forbiddenProductText);
}

async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`));
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
}

async function createPackage(page: Page, name: string, withPreview: boolean) {
  await page.getByRole('button', { name: 'Paket Ekle' }).click();
  const panel = page.locator('.offcanvas.show');
  await panel.locator('input[name="displayName"]').fill(name);
  await panel.locator('input[placeholder*="Fayda metni"]').fill(`${name} faydası`);
  await panel.locator('input[name="defaultDurationDays"]').fill('30');
  await panel.locator('input[name="searchPriority"]').fill(withPreview ? '72' : '31');
  const priceGroup = panel.locator('.mb-3').filter({ hasText: 'Fiyat (₺)' });
  await priceGroup.locator('input').fill(withPreview ? '249,90' : '99,90');
  if (withPreview) {
    await panel.locator('input[name="badgeText"]').fill('Önerilen');
    await panel.locator('input[name="allowsUrgent"]').check();
    const preview = panel.locator('.card').filter({ hasText: 'Canlı Önizleme' });
    await expect(preview).toContainText(name);
    await expect(preview).toContainText('249,90');
    await expect(preview).toContainText('30 gün');
    await expect(preview).toContainText(`${name} faydası`);
    await expect(preview).toContainText('Acil ilan');
    await expect(preview).toContainText('Önerilen');
    await expect(panel).toContainText('72/100');
  }
  await panel.locator('input[type="submit"]').click();
  await expect(page.getByRole('cell', { name })).toBeVisible();
}

test.describe.serial('Haradan final acceptance', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('authentication and protected navigation', async () => {
    const anonymous = await browser.newPage();
    await anonymous.goto('/users');
    await expect(anonymous).toHaveURL(/\/login$/);
    await expect(anonymous.locator('p.h3', { hasText: 'Giriş Yap' })).toBeVisible();
    await anonymous.close();

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(adminEmail);
    await page.locator('input[name="password"]').fill(adminPassword);
    await page.locator('input[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Haradan.com BO')).toBeVisible();
    await openPage(page, '/users', 'Kullanıcılar');
  });

  test('admin user create, canonical phone, authoritative edit and controlled resend', async () => {
    await openPage(page, '/users', 'Kullanıcılar');
    await page.getByRole('button', { name: 'Kullanıcı Ekle' }).click();
    const createPanel = page.locator('.offcanvas.show');
    await createPanel.locator('input[name="firstName"]').fill('Kabul');
    await createPanel.locator('input[name="lastName"]').fill('Yönetici');
    await createPanel.locator('input[name="email"]').fill(createdAdminEmail);
    const phone = createPanel.locator('input[name="phone"]');
    await phone.fill('6');
    await expect(phone).toHaveValue('');
    await phone.fill('+905321234567');
    await expect(phone).toHaveValue('532 123 45 67');
    await createPanel.locator('select[name="role"]').selectOption('admin');
    await createPanel.getByRole('button', { name: 'Oluştur' }).click();
    await expect(page.getByText('Kullanıcı oluşturuldu ancak davet e-postası gönderilemedi.')).toBeVisible();

    await page.getByRole('button', { name: 'Filtrele' }).click();
    await page.getByPlaceholder('Ara').fill(createdAdminEmail);
    const row = page.getByRole('row').filter({ hasText: createdAdminEmail });
    await expect(row).toContainText('Hayır');

    const listResponse = await page.request.get(`/api/v1/admin/users?limit=100&q=${encodeURIComponent(createdAdminEmail)}`);
    expect(listResponse.ok()).toBeTruthy();
    const list = await listResponse.json() as { items: Array<{ id: string; emailVerified: boolean }> };
    const detailResponse = await page.request.get(`/api/v1/admin/users/${list.items[0]?.id}`);
    expect(detailResponse.ok()).toBeTruthy();
    const persisted = await detailResponse.json() as { phone?: string };
    expect(persisted.phone).toBe('+905321234567');
    expect(list.items[0]?.emailVerified).toBe(false);

    await row.getByRole('button', { name: 'Kullanıcı detayı' }).click();
    const detailPanel = page.locator('.offcanvas.show');
    await expect(detailPanel).toContainText('532 123 45 67');
    await detailPanel.getByRole('button', { name: 'Daveti Yeniden Gönder' }).click();
    await expect(page.getByText(/E-posta gönderimi şu anda kullanılamıyor/)).toBeVisible();
    await detailPanel.locator('.btn-close').click();

    const authoritative = page.waitForResponse((response) =>
      response.request().method() === 'GET' && /\/api\/v1\/admin\/users\/[0-9a-f-]{36}$/.test(response.url()),
    );
    await row.getByRole('button', { name: 'Kullanıcı düzenle' }).click();
    await authoritative;
    const editPanel = page.locator('.offcanvas.show');
    await editPanel.locator('input[name="firstName"]').fill('Kabul Güncel');
    await editPanel.locator('input[type="submit"]').click();
    await expect(page.getByText('Kullanıcı güncellendi')).toBeVisible();
    await expect(row).toContainText('Kabul Güncel');
    await assertNoTechnicalLeaks(page);
  });

  test('categories and business-friendly properties create, edit and reorder', async () => {
    await openPage(page, '/categories', 'Kategoriler');
    for (const name of [categoryA, categoryB]) {
      await page.getByRole('button', { name: 'Yeni Kategori Ekle' }).click();
      const modal = page.locator('.modal.show');
      await modal.locator('input').first().fill(name);
      await modal.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    let categoryRow = page.locator('.rst__rowContents').filter({ hasText: categoryB });
    await categoryRow.getByTitle('Düzenle').click();
    const editModal = page.locator('.modal.show');
    await editModal.locator('input').first().fill(`${categoryB} Güncel`);
    await editModal.getByRole('button', { name: 'Güncelle' }).click();
    await expect(page.getByText(`${categoryB} Güncel`, { exact: true })).toBeVisible();
    categoryRow = page.locator('.rst__rowContents').filter({ hasText: `${categoryB} Güncel` });

    const reorderResponse = page.waitForResponse((response) =>
      response.request().method() === 'PUT' && response.url().endsWith('/api/v1/admin/categories/reorder'),
    );
    const source = page.locator('.rst__node').filter({ hasText: `${categoryB} Güncel` }).locator('.rst__moveHandle');
    const target = page.locator('.rst__node').filter({ hasText: categoryA }).locator('.rst__rowContents');
    await source.dragTo(target);
    await reorderResponse;

    await categoryRow.getByTitle('Özellikler').click();
    const properties = page.locator('.modal.show').first();
    await properties.getByRole('button', { name: 'Özellik Ekle' }).click();
    let propertyForm = page.locator('.modal.show').last();
    const typeSelect = propertyForm.locator('select');
    await expect(typeSelect.locator('option')).toHaveText([
      'Kısa Metin', 'Uzun Metin', 'Sayı', 'Ondalık Sayı', 'Evet / Hayır', 'Tek Seçim', 'Yıl',
    ]);
    await propertyForm.locator('input').nth(0).fill(`Renk ${runId}`);
    await typeSelect.selectOption({ label: 'Tek Seçim' });
    await propertyForm.locator('input[placeholder="Seçenek etiketi"]').fill('Doru');
    await propertyForm.getByRole('button', { name: '+ Seçenek Ekle' }).click();
    await propertyForm.locator('input[placeholder="Seçenek etiketi"]').nth(1).fill('Kır');
    await propertyForm.getByRole('button', { name: 'Kaydet' }).click();
    await expect(properties.getByRole('cell', { name: `Renk ${runId}` })).toBeVisible();

    await properties.getByRole('button', { name: 'Özellik Ekle' }).click();
    propertyForm = page.locator('.modal.show').last();
    await propertyForm.locator('input').nth(0).fill(`Yaş ${runId}`);
    await propertyForm.getByRole('button', { name: 'Kaydet' }).click();
    const ageRow = properties.getByRole('row').filter({ hasText: `Yaş ${runId}` });
    const propReorder = page.waitForResponse((response) =>
      response.request().method() === 'PUT' && response.url().includes('/properties/reorder'),
    );
    await ageRow.getByRole('button', { name: '↑' }).click();
    await propReorder;

    const colorRow = properties.getByRole('row').filter({ hasText: `Renk ${runId}` });
    await colorRow.getByRole('button', { name: 'Düzenle' }).click();
    propertyForm = page.locator('.modal.show').last();
    await propertyForm.locator('input').nth(1).fill('İlanda gösterilecek renk');
    await propertyForm.getByRole('button', { name: 'Kaydet' }).click();
    await assertNoTechnicalLeaks(properties);
    await expect(properties).not.toContainText(/STRING|INTEGER|BOOLEAN|SINGLE_SELECT|JSON/i);
  });

  test('packages visual editor, live preview, edit and reorder', async () => {
    await openPage(page, '/packages', 'Paketler');
    await createPackage(page, packageA, true);
    await createPackage(page, packageB, false);

    const firstRow = page.getByRole('row').filter({ hasText: packageA });
    await firstRow.locator('button.btn-outline-primary').click();
    const editPanel = page.locator('.offcanvas.show');
    await editPanel.locator('input[name="displayName"]').fill(`${packageA} Güncel`);
    await expect(editPanel.locator('.card').filter({ hasText: 'Canlı Önizleme' })).toContainText(`${packageA} Güncel`);
    await editPanel.locator('input[type="submit"]').click();
    await expect(page.getByRole('cell', { name: `${packageA} Güncel` })).toBeVisible();

    const secondRow = page.getByRole('row').filter({ hasText: packageB });
    const reorder = page.waitForResponse((response) =>
      response.request().method() === 'PUT' && response.url().endsWith('/api/v1/admin/packages/reorder'),
    );
    await secondRow.getByRole('button', { name: '↑' }).click();
    await reorder;
    await assertNoTechnicalLeaks(page);
  });

  test('banner visual UX and unconfigured storage feedback', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    await page.route(`**/api/v1/media/${bannerAssetId}/BANNER`, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
    await openPage(page, '/banners', 'Bannerlar');
    const row = page.getByRole('row').filter({ hasText: bannerTitle });
    await row.locator('a').click();
    let panel = page.locator('.offcanvas.show');
    await expect(panel).toContainText('Ana Sayfa');
    await expect(panel).toContainText('16:6');
    await expect(panel.locator('img[alt="E2E banner"]')).toBeVisible();
    await assertNoTechnicalLeaks(panel);
    await panel.locator('.btn-close').click();

    await page.getByRole('button', { name: 'Banner Ekle' }).click();
    panel = page.locator('.offcanvas.show');
    await expect(panel.locator('select[name="placement"] option')).toHaveText(['Ana Sayfa', 'İlan Detay', 'Arama']);
    await panel.locator('input[type="file"]').setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText(/gerekli hizmet şu anda kullanılamıyor/i)).toBeVisible();
    await assertNoTechnicalLeaks(panel);
  });

  test('campaign provider state and safe rich-content preview', async () => {
    await openPage(page, '/campaigns', 'Kampanyalar');
    await page.getByRole('button', { name: 'Kampanya Ekle' }).click();
    const panel = page.locator('.offcanvas.show');
    await expect(panel).toContainText('E-posta tasarım şablonları şu anda kullanılamıyor');
    await expect(panel.locator('select[name="emailProviderTemplateId"]')).toHaveCount(0);
    await panel.locator('input[name="name"]').fill(campaignName);
    await panel.locator('input[name="title"]').fill('Kabul Kampanyası');
    await panel.locator('input[name="startsAt"]').fill('2026-08-10T09:00');
    await panel.locator('input[name="endsAt"]').fill('2026-08-11T09:00');
    await panel.locator('input[name="emailSubject"]').fill('Güvenli konu');
    await panel.locator('input[name="emailHeading"]').fill('Güvenli başlık');
    const editor = panel.locator('.ck-editor__editable');
    await editor.click();
    await editor.fill('<script>window.__haradanUnsafe=1</script><img src=x onerror="window.__haradanUnsafe=1"><a href="javascript:window.__haradanUnsafe=1">Güvenli metin</a>');
    const preview = panel.locator('.card').filter({ hasText: 'Güvenli Yedek E-posta Önizlemesi' });
    await expect(preview).toContainText('Güvenli metin');
    await expect(preview.locator('script')).toHaveCount(0);
    await expect(preview.locator('[onerror]')).toHaveCount(0);
    await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as typeof window & { __haradanUnsafe?: number }).__haradanUnsafe)).toBeUndefined();
    await assertNoTechnicalLeaks(panel);
    await panel.locator('input[type="submit"]').click();
    await expect(page.getByRole('cell', { name: campaignName })).toBeVisible();
  });

  test('scheduled definitions are exact and business-friendly', async () => {
    await openPage(page, '/jobs', 'Zamanlanmış Görevler');
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(page.getByRole('cell', { name: 'TJK at özeti senkronu' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Paket bitiş hatırlatma taraması' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Medya depolama eşitleme' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/TJK_SYNC_BATCH|MEDIA_VALIDATE|cron|kuyruk|worker/i);
    await assertNoTechnicalLeaks(page);
    await rows.first().getByRole('button', { name: 'Düzenle' }).click();
    const panel = page.locator('.offcanvas.show');
    await expect(panel).toContainText('Çalışma sıklığı');
    await expect(panel.locator('input[name="cronExpression"]')).toHaveCount(0);
  });

  test('TJK queued cancel, immediate retrigger and fake full sync', async () => {
    await openPage(page, '/tjk', 'TJK Senkron');
    await page.getByRole('button', { name: 'Manuel Senkron Başlat' }).click();
    await page.locator('.offcanvas.show input[type="submit"]').click();
    let newest = page.locator('tbody tr').first();
    await expect(newest).toContainText('Bekliyor');
    await newest.getByRole('button', { name: 'İptal' }).click();
    await expect(page.getByText('İptal edildi')).toBeVisible();
    await expect(newest).toContainText('İptal');
    await expect(page.locator('body')).not.toContainText(/beklenmeyen bir hata|generic|expectedVersion/i);

    await page.getByRole('button', { name: 'Manuel Senkron Başlat' }).click();
    await page.locator('.offcanvas.show input[type="submit"]').click();
    newest = page.locator('tbody tr').first();
    await expect(newest).toContainText('Bekliyor');
    writeFileSync(required('E2E_WORKER_START_FILE'), 'start');
    await expect(newest).toContainText('Başarılı', { timeout: 30_000 });
    await assertNoTechnicalLeaks(page);
  });
});
