import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
test('responsive storefront, navigation and accessibility', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'Less, but better.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  mkdirSync('artifacts', { recursive: true });
  // Visit image positions so native lazy loading finishes before the full-page capture.
  for (const img of await page.locator('main img').all()) {
    if (await img.isVisible()) await img.scrollIntoViewIfNeeded();
  }
  await expect
    .poll(() =>
      page
        .locator('main img')
        .evaluateAll((imgs) =>
          imgs.every(
            (img) =>
              img.getClientRects().length === 0 ||
              ((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0),
          ),
        ),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: 'artifacts/home-' + testInfo.project.name + '.png',
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'ORVEN' })).toBeVisible();
    await page.getByRole('dialog').getByRole('link', { name: 'Our story' }).click();
    await expect(
      page.getByRole('heading', { name: 'Good things take consideration.' }),
    ).toBeVisible();
  }
  await page.goto('/products/the-forma-tote');
  const productAudit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(productAudit.violations).toEqual([]);
  await page.screenshot({
    path: 'artifacts/product-' + testInfo.project.name + '.png',
    fullPage: true,
  });
});
test('browse → add to bag → sandbox checkout → confirmation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Less, but better.' })).toBeVisible();
  await page.getByRole('link', { name: 'Discover the collection' }).click();
  await page
    .getByRole('heading', { name: 'The Forma Tote', exact: true })
    .getByRole('link')
    .click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.locator('.cart-toast')).toContainText('Added to your bag');
  await expect(page.locator('.cart-toast')).toContainText('The Forma Tote');
  await expect(page.getByRole('button', { name: 'Open bag, 1 items' })).toBeVisible();
  await page.locator('.cart-toast').getByRole('link', { name: 'View Bag' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page
    .getByRole('main')
    .getByLabel('Email address', { exact: true })
    .fill('smoke@example.test');
  await page.getByRole('main').getByLabel('Full name', { exact: true }).fill('Sample Buyer');
  await page.getByRole('main').getByLabel('Street address').fill('12 Fictional Lane');
  await page.getByRole('main').getByLabel('City', { exact: true }).fill('New York');
  await page.getByRole('main').getByLabel('State / region').fill('NY');
  await page.getByRole('main').getByLabel('Postal code').fill('10001');
  await page.getByRole('button', { name: 'Review your order' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place sandbox order' }).click();
  await expect(page.getByRole('heading', { name: 'Thoughtfully chosen.' })).toBeVisible();
  await expect(page.getByText('Simulated order.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open bag, 0 items' })).toBeVisible();
});
test('adding a product keeps the customer on the page and confirms the saved cart item', async ({
  page,
}) => {
  const product = {
    id: 'cart-ui-product',
    name: 'The Forma Tote',
    slug: 'the-forma-tote',
    price: 790000,
    salePercent: 0,
    images: [{ id: 'cart-ui-image', url: '/images/tote.webp', alt: 'Forma Tote' }],
  };
  const cartResponse = (variantId?: string) => ({
    id: 'cart-ui-test',
    pendingOrder: null,
    promotionCode: '',
    promoError: '',
    items: variantId
      ? [
          {
            id: 'cart-ui-item',
            variantId,
            quantity: 1,
            variant: { id: variantId, color: 'Cognac', size: 'One size', product },
          },
        ]
      : [],
    totals: { subtotal: 790000, discount: 0, shipping: 0, tax: 0, total: 790000 },
  });
  await page.route('**/api/csrf', (route) => route.fulfill({ json: { token: 'cart-ui-test' } }));
  await page.route('**/api/store/cart', (route) => route.fulfill({ json: cartResponse() }));
  await page.route('**/api/store/cart/item', async (route) => {
    const body = route.request().postDataJSON() as { variantId: string };
    await route.fulfill({ json: cartResponse(body.variantId) });
  });

  await page.goto('/products/the-forma-tote');
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page).toHaveURL(/\/products\/the-forma-tote$/);
  await expect(page.locator('.cart-toast')).toContainText('Added to your bag');
  await page.locator('.cart-toast').hover();
  await expect(page.locator('.cart-toast')).toContainText('The Forma Tote');
  await expect(page.locator('.cart-toast')).toContainText('Cognac');
  await expect(page.getByRole('button', { name: 'Open bag, 1 items' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Added' })).toBeDisabled();

  await page.locator('.cart-toast').getByRole('link', { name: 'View Bag' }).click();
  await expect(page).toHaveURL(/\/cart$/);
});
test('collection filters are shareable and keyboard gallery works', async ({ page }) => {
  await page.goto('/collections?category=Totes&sort=price-desc');
  await expect(page.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue('Totes');
  await expect(
    page
      .getByRole('navigation', { name: 'Collections' })
      .getByRole('link', { name: 'All collections' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'All pieces.', exact: true })).toHaveCount(0);
  await expect(page.getByText('CONCEPT SAMPLE', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: /concept sample/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  const collectionTabs = page.getByRole('navigation', { name: 'Collections' });
  await collectionTabs.getByRole('link', { name: 'The Everyday' }).click();
  await expect(page).toHaveURL(
    /\/collections\?category=Totes&sort=price-desc&collection=the-everyday$/,
    { timeout: 20000 },
  );
  await expect(collectionTabs.getByRole('link', { name: 'The Everyday' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await collectionTabs.getByRole('link', { name: 'All collections' }).click();
  await expect(page).toHaveURL(/\/collections\?category=Totes&sort=price-desc$/, {
    timeout: 20000,
  });
  await page.getByRole('heading', { name: 'The Tall Tote', exact: true }).getByRole('link').click();
  await expect(page.getByRole('group', { name: /Product images for The Tall Tote/ })).toBeVisible({
    timeout: 20000,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByRole('button', { name: 'Zoom product image' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog').getByText('2 / 2')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('collection empty state keeps the active count and clears search filters', async ({
  page,
}) => {
  await page.goto('/collections?q=orven-no-matching-piece');
  await expect(
    page.getByRole('heading', { name: 'A quieter corner of the collection.' }),
  ).toBeVisible();
  await expect(page.locator('.collection-count [role="status"]')).toHaveText('0 pieces');
  await page
    .locator('.empty-state')
    .getByRole('link', { name: 'Clear filters', exact: true })
    .click();
  await expect(page).toHaveURL(/\/collections$/, { timeout: 20000 });
});
test('admin APIs require role and CSRF checks', async ({ request }) => {
  const noCsrf = await request.post('/api/store/admin/inventory', {
    data: { variantId: 'x', delta: 1, reason: 'Test adjustment' },
  });
  expect(noCsrf.status()).toBe(403);
  const csrf = await request.get('/api/csrf');
  const { token } = await csrf.json();
  const forbidden = await request.post('/api/store/admin/inventory', {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
      'x-csrf-token': token,
    },
    data: { variantId: 'x', delta: 1, reason: 'Test adjustment' },
  });
  expect(forbidden.status()).toBe(403);
});
test('seeded account access and protected atelier tools', async ({ page }) => {
  await page.goto('/account');
  await page
    .getByRole('main')
    .getByLabel('Email address', { exact: true })
    .fill('customer@orven.test');
  await page
    .getByRole('main')
    .getByLabel(/^Password/)
    .fill(process.env.DEPLOY_CUSTOMER_PASSWORD || 'Orven2026!demo');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Alex.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your pieces, in progress.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page
    .getByRole('main')
    .getByLabel('Email address', { exact: true })
    .fill('admin@orven.test');
  await page
    .getByRole('main')
    .getByLabel(/^Password/)
    .fill(process.env.DEPLOY_ADMIN_PASSWORD || 'Atelier2026!demo');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  if (await page.getByRole('button', { name: 'Open admin navigation' }).isVisible())
    await page.getByRole('button', { name: 'Open admin navigation' }).click();
  await page
    .getByRole('navigation', { name: /^(Administration|Mobile administration)$/ })
    .getByRole('link', { name: 'Promotions', exact: true })
    .click();
  await expect(page.getByText('WELCOME10', { exact: true })).toBeVisible();
  if (await page.getByRole('button', { name: 'Open admin navigation' }).isVisible())
    await page.getByRole('button', { name: 'Open admin navigation' }).click();
  await page
    .getByRole('navigation', { name: /^(Administration|Mobile administration)$/ })
    .getByRole('link', { name: 'Products', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
});
