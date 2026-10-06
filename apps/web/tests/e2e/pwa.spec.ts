import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

test.use({ serviceWorkers: 'allow' });
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Service-worker checks run in Chromium only',
);

interface ManifestIcon {
  sizes: string;
  purpose?: string;
}

test('the manifest describes an installable app', async ({ page, request }) => {
  await page.goto('/welcome');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = (await (await request.get(href ?? '')).json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: ManifestIcon[];
  };
  expect(manifest).toMatchObject({ name: 'NutriSnap', display: 'standalone', start_url: '/' });
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
});

test('the app shell loads offline once the service worker is ready', async ({ page, context }) => {
  await completeOnboarding(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await context.setOffline(false);
});
