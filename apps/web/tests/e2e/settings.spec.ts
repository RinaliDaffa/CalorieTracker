import { expect, test } from '@playwright/test';
import { geminiText, mockGemini } from './ai';
import { item, meal, todayKey } from './data';
import { completeOnboarding, expectNoSeriousA11yViolations, seed } from './helpers';

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/settings');
});

test('the screen is accessible and reports storage', async ({ page }) => {
  await expect(page.getByTestId('storage-estimate')).not.toHaveText('…');
  await expectNoSeriousA11yViolations(page);
});

test('theme choice applies at once and survives a reload', async ({ page }) => {
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expectNoSeriousA11yViolations(page);
});

test('switching language reloads in Indonesian', async ({ page }) => {
  await page.getByRole('button', { name: 'Bahasa Indonesia' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pengaturan' })).toBeVisible();
});

test('targets are validated, saved and used by the dashboard', async ({ page }) => {
  await page.getByLabel('Calories (kcal)').fill('100');
  await page.getByRole('button', { name: 'Save targets' }).click();
  await expect(page.getByText('Check the highlighted values.')).toBeVisible();
  await expect(page.getByLabel('Calories (kcal)')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Calories (kcal)').fill('1800');
  await page.getByRole('button', { name: 'Save targets' }).click();
  await expect(page.getByText('Targets saved')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('calories-remaining')).toHaveText('1,800 kcal remaining');
});

test('a new key is checked before it is saved', async ({ page }) => {
  await mockGemini(page, (_body, call) =>
    call === 0
      ? {
          status: 400,
          body: {
            error: { code: 400, message: 'API key not valid. Please pass a valid API key.' },
          },
        }
      : { body: geminiText('ok') },
  );
  await page.getByLabel('Gemini API key').fill('bad');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText("That key didn't work. Check it and try again.");
  await page.getByLabel('Gemini API key').fill('good');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('API key saved')).toBeVisible();
});

test("CSV export downloads today's meals", async ({ page }) => {
  await seed(page, { meals: [meal(todayKey(), 'lunch', [item('=cmd|calc', 400)])] });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`nutrisnap-export-${todayKey()}.csv`);
  const content = await (await file.createReadStream()).toArray();
  const text = Buffer.concat(content).toString('utf8');
  expect(text).toContain(`"'=cmd|calc"`);
});

test('clearing chat can be undone', async ({ page }) => {
  await seed(page, {
    chats: [{ id: 'c1', role: 'user', content: 'Halo', createdAt: 1, updatedAt: 1 }],
  });
  await page.getByRole('button', { name: 'Clear chat history' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.goto('/chat');
  await expect(page.getByRole('log')).toContainText('Halo');
});

test('an old-app JSON export can be imported once', async ({ page }) => {
  const exportFile = {
    format: 'nutrisnap-legacy',
    version: 1,
    exportedAt: new Date().toISOString(),
    meals: [
      {
        id: 'old',
        date: todayKey(),
        mealType: 'dinner',
        timestamp: Date.now(),
        foodItems: [
          {
            name: 'Martabak',
            servingSize: '2 potong',
            calories: 520,
            protein: 12,
            carbs: 60,
            fat: 26,
          },
        ],
        nutrition: { calories: 520, protein: 12, carbs: 60, fat: 26, fiber: 0, sugar: 0 },
      },
    ],
    photos: [],
    goals: [],
    settings: [],
    favorites: [],
    chats: [],
  };
  const input = page.getByTestId('legacy-json-input');
  const payload = {
    name: 'nutrisnap-legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exportFile)),
  };
  await input.setInputFiles(payload);
  await expect(page.getByText('Your data from the old app was imported.')).toBeVisible();
  await input.setInputFiles(payload);
  await expect(page.getByText('Old data was already imported.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Martabak')).toBeVisible();
});

test('a foreign JSON file is refused', async ({ page }) => {
  await page.getByTestId('legacy-json-input').setInputFiles({
    name: 'other.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":1}'),
  });
  await expect(page.getByText("That file isn't a NutriSnap export.")).toBeVisible();
});
