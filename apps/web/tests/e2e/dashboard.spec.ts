import { expect, test } from '@playwright/test';
import { item, meal, todayKey } from './data';
import { completeOnboarding, expectNoSeriousA11yViolations, seed } from './helpers';

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
});

test('shows an empty day', async ({ page }) => {
  await expect(page.getByText('No meals yet')).toBeVisible();
  await expect(page.getByTestId('calories-remaining')).toHaveText('2,000 kcal remaining');
  await expectNoSeriousA11yViolations(page);
});

test('adds up today and ignores other days', async ({ page }) => {
  await seed(page, {
    meals: [
      meal(todayKey(), 'breakfast', [item('Bubur ayam', 350)], 7),
      meal(todayKey(), 'lunch', [item('Nasi padang', 750), item('Es jeruk', 100)], 12),
      meal(todayKey(-1), 'dinner', [item('Sate', 500)], 19),
    ],
  });
  await expect(page.getByTestId('calories-remaining')).toHaveText('800 kcal remaining');
  await expect(page.getByText('2 entries')).toBeVisible();
  await expect(page.getByText('Nasi padang, Es jeruk')).toBeVisible();
  await expect(page.getByText('Sate')).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);
});

test('opens a meal, deletes it, and undo brings it back', async ({ page }) => {
  await seed(page, { meals: [meal(todayKey(), 'lunch', [item('Gado-gado', 420)])] });
  await page.getByRole('button', { name: /Gado-gado/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Gado-gado')).toBeVisible();
  await expectNoSeriousA11yViolations(page);
  await sheet.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No meals yet')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /Gado-gado/ })).toBeVisible();
});

test('shows the meal photo in the detail sheet', async ({ page, browserName }) => {
  // Playwright's WebKit uses an ephemeral profile in which IndexedDB rejects Blob values
  // ("Error preparing Blob/File data to be stored in object store"); Chromium and Firefox cover this.
  test.skip(browserName === 'webkit', 'WebKit test profile cannot store Blobs in IndexedDB');
  const record = meal(todayKey(), 'dinner', [item('Rendang', 500)]);
  await page.evaluate(async (m) => {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    canvas.getContext('2d')?.fillRect(0, 0, 40, 30);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg'),
    );
    const { db } = (
      window as unknown as { __nutrisnap: { db: import('../../src/db/schema').NutriSnapDb } }
    ).__nutrisnap;
    await db.photos.put({
      id: 'photo-1',
      full: blob,
      thumb: blob,
      takenAt: m.time,
      updatedAt: m.time,
    });
    await db.meals.put({ ...m, photoId: 'photo-1' });
  }, record);
  await page.getByRole('button', { name: /Rendang/ }).click();
  await expect(
    page.getByRole('dialog').getByRole('img', { name: 'Photo of this meal' }),
  ).toBeVisible({ timeout: 15000 }); // lazy sheet chunk + blob decode can be slow under 8 workers
});
