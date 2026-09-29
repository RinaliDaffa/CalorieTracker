import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

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
