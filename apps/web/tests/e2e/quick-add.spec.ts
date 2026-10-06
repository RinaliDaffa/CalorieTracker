import { expect, test } from '@playwright/test';
import { geminiText, mockGemini, NASI_GORENG } from './ai';
import { favorite, item } from './data';
import { completeOnboarding, expectNoSeriousA11yViolations, seed } from './helpers';

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
});

test('type a meal, pick its type, and it is saved', async ({ page }) => {
  await mockGemini(page, () => ({ body: geminiText(JSON.stringify(NASI_GORENG)) }));
  await page.getByRole('button', { name: 'Type it' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add a meal' });
  await sheet.getByLabel('What did you eat?').fill('nasi goreng, es teh');
  await sheet.getByRole('radio', { name: 'Dinner' }).click();
  await expectNoSeriousA11yViolations(page);
  await sheet.getByRole('button', { name: 'Analyze & save' }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('button', { name: /Dinner.*Nasi goreng, Es teh manis/ }),
  ).toBeVisible();
});

test('an empty description is refused without calling the AI', async ({ page }) => {
  const api = await mockGemini(page, () => ({ body: geminiText('{}') }));
  await page.getByRole('button', { name: 'Type it' }).click();
  await page.getByRole('button', { name: 'Analyze & save' }).click();
  await expect(page.getByText('Describe your meal first.')).toBeVisible();
  expect(api.calls()).toBe(0);
});

test('log a favorite, remove one and undo', async ({ page }) => {
  await seed(page, {
    favorites: [
      favorite('Soto ayam', [item('Soto ayam', 320)]),
      favorite('Pecel', [item('Pecel', 280)]),
    ],
  });
  await page.getByRole('button', { name: 'Favorites' }).click();
  const sheet = page.getByRole('dialog', { name: 'Favorites' });
  await expect(sheet.getByText('320 kcal · P 10 g · C 20 g · F 5 g')).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await sheet.getByRole('button', { name: 'Add Soto ayam' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: /Soto ayam/ })).toBeVisible();
  await expect(page.getByTestId('calories-remaining')).toHaveText('1,680 kcal remaining');

  await page.getByRole('button', { name: 'Favorites' }).click();
  await page.getByRole('button', { name: 'Remove Pecel' }).click();
  await expect(page.getByRole('dialog').getByText('Pecel')).toHaveCount(0);
  // Close the sheet first: a tap outside a modal sheet also dismisses it, and
  // the test should not depend on which of the two happens first.
  await page.keyboard.press('Escape');
  // The earlier "Added from favorites" toast may still show its own Undo.
  await page
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'Favorite removed' })
    .getByRole('button', { name: 'Undo' })
    .click();
  await page.getByRole('button', { name: 'Favorites' }).click();
  await expect(page.getByRole('dialog').getByText('Pecel')).toBeVisible();
});

test('shows an empty state without favorites', async ({ page }) => {
  await page.getByRole('button', { name: 'Favorites' }).click();
  await expect(page.getByText('No favorites yet')).toBeVisible();
});
