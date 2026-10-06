import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import type { ChatRecord, FavoriteRecord, MealRecord, NutriSnapDb } from '../../src/db/schema';

type TestWindow = Window & { __nutrisnap: { db: NutriSnapDb } };

export async function enableTestMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __NUTRISNAP_TEST__: boolean }).__NUTRISNAP_TEST__ = true;
  });
}

export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

/** Boot attaches the test handle asynchronously; after any navigation it is briefly missing. */
async function waitForTestDb(page: Page): Promise<void> {
  await page.waitForFunction(() => '__nutrisnap' in window, undefined, { timeout: 15_000 });
}

/** Test mode on, a stored key, onboarding done, dashboard open. */
export async function completeOnboarding(page: Page): Promise<void> {
  await enableTestMode(page);
  await page.goto('/welcome');
  // Let the first boot finish rendering before seeding and navigating away.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  await waitForTestDb(page);
  await page.evaluate(async () => {
    const { db } = (window as unknown as TestWindow).__nutrisnap;
    await db.settings.bulkPut([
      { key: 'apiKey', value: 'test-key', updatedAt: Date.now() },
      { key: 'onboarded', value: true, updatedAt: Date.now() },
    ]);
  });
  await page.goto('/');
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 15_000 });
}

export async function seed(
  page: Page,
  data: { meals?: MealRecord[]; favorites?: FavoriteRecord[]; chats?: ChatRecord[] },
): Promise<void> {
  await waitForTestDb(page);
  await page.evaluate(async (records) => {
    const { db } = (window as unknown as TestWindow).__nutrisnap;
    if (records.meals) await db.meals.bulkPut(records.meals);
    if (records.favorites) await db.favorites.bulkPut(records.favorites);
    if (records.chats) await db.chats.bulkPut(records.chats);
  }, data);
}
