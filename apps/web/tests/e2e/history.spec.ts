import { expect, test } from '@playwright/test';
import { item, meal, todayKey } from './data';
import { completeOnboarding, expectNoSeriousA11yViolations, seed } from './helpers';

function monthStart(offset: number): string {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
}

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
  await seed(page, {
    meals: [
      meal(todayKey(), 'lunch', [item('Nasi uduk', 500, 12, 70, 18)]),
      meal(todayKey(), 'dinner', [item('Pecel lele', 650, 30, 40, 35)], 19),
      meal(monthStart(-1), 'lunch', [item('Bakso', 450)]),
    ],
  });
  await page.goto('/history');
});

test('today is selected and summarized', async ({ page }) => {
  const summary = page.getByTestId('day-summary');
  await expect(summary).toContainText('1,150');
  await expect(summary).toContainText('2');
  await expect(page.getByRole('button', { name: /Nasi uduk/ })).toBeVisible();
  await expect(page.locator('[data-testid="week-bar"]')).toHaveCount(7);
  await expectNoSeriousA11yViolations(page);
});

test('logged days are marked and an empty day says so', async ({ page }) => {
  await expect(page.locator('button[data-logged="true"]').first()).toBeVisible();
  const emptyDay = page.locator('button[aria-pressed="false"]:not([data-logged])').first();
  await emptyDay.click();
  await expect(page.getByText('No meals on this day')).toBeVisible();
});

test('previous month opens on its first day, and meal detail works there', async ({ page }) => {
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page).toHaveURL(new RegExp(`date=${monthStart(-1)}`));
  await expect(page.getByTestId('day-summary')).toContainText('450');
  await page.getByRole('button', { name: /Bakso/ }).click();
  await expect(page.getByRole('dialog').getByText('Bakso')).toBeVisible();
});
