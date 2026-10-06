import { test, expect, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
async function signIn(request: APIRequestContext) {
  const { token } = await (await request.get('/api/csrf')).json();
  const response = await request.post('/api/store/auth/login', {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
      'x-csrf-token': token,
    },
    data: { email: 'admin@orven.test', password: 'Atelier2026!demo' },
  });
  expect(response.status()).toBe(200);
}
test.beforeEach(async ({ page }) => signIn(page.request));
test('admin dashboard is responsive, accessible and reports real periods', async ({
  page,
}, info) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await expect(page.getByRole('button', { name: /Open bag/ })).toHaveCount(0);
  await page.getByLabel('Reporting period').selectOption('7');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page).toHaveURL(/days=7/);
  await page.getByText('View daily values', { exact: true }).click();
  await expect(page.locator('.a-chart-data tbody tr')).toHaveCount(7);
  await page.getByText('View daily values', { exact: true }).click();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({
    path: 'artifacts/admin-dashboard-' + info.project.name + '.png',
    fullPage: true,
  });
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open admin navigation' }).click();
    await expect(page.getByRole('dialog', { name: 'Admin navigation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
});
test('product records support pagination, search, empty states and filtered export', async ({
  page,
}, info) => {
  await page.goto('/admin/products');
  await expect(page.locator('tbody tr')).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByLabel('Search products').fill('Forma');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const href = await page.getByRole('link', { name: 'Export CSV' }).getAttribute('href');
  const exported = await page.request.get(href!);
  expect(exported.status()).toBe(200);
  expect(exported.headers()['content-type']).toContain('text/csv');
  const csv = await exported.text();
  expect(csv).toContain('The Forma Tote');
  expect(csv).not.toContain('The Arc Shoulder Bag');
  await page.screenshot({
    path: 'artifacts/admin-products-' + info.project.name + '.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByLabel('Search products').fill('no-such-product-92471');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching products' })).toBeVisible();
  await page.getByRole('link', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(12);
});
test('product price editor and inventory adjustments persist safely', async ({ page }, info) => {
  await page.goto('/admin/products?q=Forma');
  await page.getByRole('link', { name: 'Edit The Forma Tote' }).click();
  const original = await page.getByLabel('Price (USD)', { exact: true }).inputValue();
  const editUrl = page.url();
  await expect(page.getByText('Images (JSON)', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: 'artifacts/admin-product-editor-' + info.project.name + '.png',
    fullPage: true,
  });
  try {
    await page.getByLabel('Price (USD)', { exact: true }).fill((Number(original) + 1).toFixed(2));
    await page.getByRole('button', { name: 'Save product', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await page.goto(editUrl);
    await expect(page.getByLabel('Price (USD)', { exact: true })).toHaveValue(
      (Number(original) + 1).toFixed(2),
    );
  } finally {
    await page.goto(editUrl);
    await page.getByLabel('Price (USD)', { exact: true }).fill(original);
    await page.getByRole('button', { name: 'Save product', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  }
  await page.goto('/admin/inventory?q=Forma');
  const row = page.locator('tbody tr').first();
  const quantity = Number(await row.locator('td').nth(3).innerText());
  await row.getByRole('button', { name: 'Adjust', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Adjust inventory' });
  await dialog.getByLabel('Quantity change').fill('1');
  await dialog.getByLabel('Reason', { exact: true }).fill('Browser verification stock receipt');
  await dialog.getByRole('button', { name: 'Save adjustment' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row.locator('td').nth(3)).toHaveText(String(quantity + 1));
  await row.getByRole('button', { name: 'Adjust', exact: true }).click();
  await dialog.getByLabel('Quantity change').fill('-1');
  await dialog.getByLabel('Reason', { exact: true }).fill('Browser verification restoring stock');
  await dialog.getByRole('button', { name: 'Save adjustment' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row.locator('td').nth(3)).toHaveText(String(quantity));
});
test('order detail shows totals, tracking validation and persisted internal notes', async ({
  page,
}) => {
  await page.goto('/admin/orders?state=unfulfilled');
  await page.locator('tbody tr').first().getByRole('link').click();
  await expect(page.getByRole('heading', { name: 'Order timeline' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shipping address' })).toBeVisible();
  const status = await page.getByLabel('Fulfillment status').inputValue();
  const notes = await page.getByLabel('Internal notes').inputValue();
  await page.getByLabel('Fulfillment status').selectOption('SHIPPED');
  await expect(page.getByLabel('Carrier', { exact: true })).toHaveAttribute('required', '');
  await expect(page.getByLabel('Tracking number', { exact: true })).toHaveAttribute('required', '');
  await page.getByLabel('Fulfillment status').selectOption(status);
  try {
    await page.getByLabel('Internal notes').fill(notes + '\nVerified admin order editor');
    await page.getByRole('button', { name: 'Update order' }).click();
    await expect(page.getByRole('status')).toHaveText('Changes saved successfully.');
    await page.reload();
    await expect(page.getByLabel('Internal notes')).toHaveValue(
      notes + '\nVerified admin order editor',
    );
  } finally {
    await page.getByLabel('Internal notes').fill(notes);
    await page.getByRole('button', { name: 'Update order' }).click();
    await expect(page.getByRole('status')).toHaveText('Changes saved successfully.');
  }
});
