import { expect, type Page, test } from '@playwright/test';
import { geminiText, mockGemini } from './ai';
import { enableTestMode, expectNoSeriousA11yViolations } from './helpers';

// A cold first boot can be slow with many parallel browsers, so wait for the
// screen to render (auto-waiting, generous ceiling) before interacting.
async function openWelcome(page: Page): Promise<void> {
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await enableTestMode(page);
});

test('a first visit lands on the welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Welcome to NutriSnap' })).toBeVisible({
    timeout: 15_000,
  });
  await expectNoSeriousA11yViolations(page);
});

test('a valid key is saved and opens the app', async ({ page }) => {
  const api = await mockGemini(page, () => ({ body: geminiText('ok') }));
  await openWelcome(page);
  await page.getByLabel('Gemini API key').fill('AIza-valid');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(api.calls()).toBe(1);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});

test('an invalid key shows an error and stays', async ({ page }) => {
  await mockGemini(page, () => ({
    status: 400,
    body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } },
  }));
  await openWelcome(page);
  await page.getByLabel('Gemini API key').fill('bad');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByRole('alert')).toHaveText("That key didn't work. Check it and try again.");
  await expect(page).toHaveURL(/\/welcome$/);
});

test('an empty key is caught before any request', async ({ page }) => {
  const api = await mockGemini(page, () => ({ body: geminiText('ok') }));
  await openWelcome(page);
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a key first.');
  expect(api.calls()).toBe(0);
});

test('"Later" opens the app without a key', async ({ page }) => {
  await openWelcome(page);
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});
