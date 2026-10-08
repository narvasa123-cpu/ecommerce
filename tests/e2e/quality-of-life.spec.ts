import { test, expect } from '@playwright/test';

test('back-to-top appears on long storefront pages and scrolls to the beginning', async ({
  page,
}) => {
  await page.goto('/story');
  const button = page.getByRole('button', { name: 'Back to top' });
  await expect(button).toBeHidden();
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
