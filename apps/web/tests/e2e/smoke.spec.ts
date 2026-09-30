import { expect, test } from '@playwright/test';
import { completeOnboarding, expectNoSeriousA11yViolations } from './helpers';

test('every main screen is reachable from the navigation', async ({ page }) => {
  await completeOnboarding(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  const screens = [
    ['History', 'History'],
    ['Scan', 'Scan your food'],
    ['Ask AI', 'NutriSnap AI'],
    ['Settings', 'Settings'],
  ] as const;
  for (const [link, heading] of screens) {
    await nav.getByRole('link', { name: link }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  }
});
