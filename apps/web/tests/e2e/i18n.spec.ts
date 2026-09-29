import { expect, test } from '@playwright/test';

test.describe('Indonesian browser', () => {
  test.use({ locale: 'id-ID' });

  test('shows the interface in Indonesian', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Utama' });
    await expect(nav.getByRole('link', { name: 'Riwayat' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  });
});

test.describe('other browser languages', () => {
  test.use({ locale: 'ja-JP' });

  test('fall back to English', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'History' }),
    ).toBeVisible();
  });
});
