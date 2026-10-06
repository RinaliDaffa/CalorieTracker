import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { geminiText, mockGemini, NASI_GORENG } from './ai';
import { completeOnboarding, expectNoSeriousA11yViolations } from './helpers';

const ok = () => ({ body: geminiText(JSON.stringify(NASI_GORENG)) });

type TestDb = import('../../src/db/schema').NutriSnapDb;

async function takePhoto(page: Page) {
  await page.getByRole('button', { name: 'Start camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
}

async function mealCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const { db } = (window as unknown as { __nutrisnap: { db: TestDb } }).__nutrisnap;
    return db.meals.filter((meal) => meal.deletedAt === undefined).count();
  });
}

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/scan');
});

test('a photo is analyzed, saved automatically, and shows on the dashboard', async ({ page }) => {
  const api = await mockGemini(page, ok);
  await takePhoto(page);
  await expect(page.getByTestId('result-items')).toContainText('Nasi goreng');
  await expect(page.getByTestId('result-items')).toContainText('Es teh manis');
  await expect(page.getByText(/Saved/)).toBeVisible();
  expect(api.calls()).toBe(1);
  await expectNoSeriousA11yViolations(page);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('calories-remaining')).toHaveText('1,310 kcal remaining');
});

test('undo removes the saved meal', async ({ page }) => {
  await mockGemini(page, ok);
  await takePhoto(page);
  await expect(page.getByTestId('result-items')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('result-items')).toHaveCount(0);
  expect(await mealCount(page)).toBe(0);
});

test('the meal type can be changed after saving', async ({ page }) => {
  await mockGemini(page, ok);
  await takePhoto(page);
  await page.getByRole('radio', { name: 'Snack' }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { db } = (window as unknown as { __nutrisnap: { db: TestDb } }).__nutrisnap;
        return (await db.meals.toArray())[0]?.mealType;
      }),
    )
    .toBe('snack');
});

test('a failed analysis keeps the photo and retries', async ({ page }) => {
  await mockGemini(page, (_body, call) =>
    call === 0 ? { status: 500, body: { error: { code: 500, message: 'Internal error' } } } : ok(),
  );
  await takePhoto(page);
  await expect(page.getByRole('alert')).toContainText("Couldn't analyze this");
  await expect(page.getByRole('img', { name: 'Photo of this meal' })).toBeVisible();
  expect(await mealCount(page)).toBe(0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('result-items')).toContainText('Nasi goreng');
});

test('a meal can be described in words', async ({ page }) => {
  const api = await mockGemini(page, ok);
  await page.getByLabel('Or describe your meal').fill('nasi goreng dan es teh');
  await page.getByRole('button', { name: 'Analyze' }).click();
  await expect(page.getByTestId('result-items')).toContainText('Nasi goreng');
  expect(api.calls()).toBe(1);
});

test('a gallery photo is compressed and analyzed', async ({ page }) => {
  let sentBytes = 0;
  await mockGemini(page, (body) => {
    const parts =
      (body as { contents: { parts: { inlineData?: { data: string } }[] }[] }).contents[0]?.parts ??
      [];
    sentBytes = parts.find((p) => p.inlineData)?.inlineData?.data.length ?? 0;
    return ok();
  });
  await page
    .getByTestId('gallery-input')
    .setInputFiles(path.join(import.meta.dirname, '../../public/icon-source.png'));
  await expect(page.getByTestId('result-items')).toContainText('Nasi goreng');
  expect(sentBytes).toBeGreaterThan(0);
  expect(sentBytes).toBeLessThan(400_000);
});

test('unreadable gallery file', async ({ page }) => {
  const api = await mockGemini(page, ok);
  await page.getByTestId('gallery-input').setInputFiles({
    name: 'meal.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('this is not an image'),
  });
  await expect(page.getByText("That image couldn't be read. Try another photo.")).toBeVisible();
  expect(api.calls()).toBe(0);
  expect(await mealCount(page)).toBe(0);
});

test('double tap saves one meal', async ({ page }) => {
  const api = await mockGemini(page, ok);
  await page.getByRole('button', { name: 'Start camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).dblclick();
  await expect(page.getByTestId('result-items')).toBeVisible();
  await page.getByLabel('Or describe your meal').fill('soto');
  await page.getByRole('button', { name: 'Analyze' }).dblclick();
  await expect.poll(() => api.calls()).toBe(2);
  await page.waitForTimeout(500);
  expect(api.calls()).toBe(2);
  expect(await mealCount(page)).toBe(2);
});
