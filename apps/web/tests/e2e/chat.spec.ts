import { expect, test } from '@playwright/test';
import { geminiText, mockGemini } from './ai';
import { completeOnboarding, expectNoSeriousA11yViolations } from './helpers';

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/chat');
});

test('a suggestion sends a message and the reply renders its formatting', async ({ page }) => {
  let prompt = '';
  await mockGemini(page, (body) => {
    prompt = JSON.stringify(body);
    return { body: geminiText('Try **tempe** and *telur*:\n- Tempe goreng\n- Telur rebus') };
  });
  await page.getByRole('button', { name: 'More protein ideas' }).click();
  const log = page.getByRole('log');
  await expect(log.locator('[data-role="user"]')).toContainText(
    'What should I eat to get more protein?',
  );
  await expect(log.locator('strong')).toHaveText('tempe');
  await expect(log.getByRole('listitem')).toHaveCount(2);
  expect(prompt).toContain("Today's intake so far");
  await expectNoSeriousA11yViolations(page);
});

test('markup in a reply is shown as text, never executed', async ({ page }) => {
  await mockGemini(page, () => ({
    body: geminiText('<img src=x onerror="window.__pwned=1"> hello'),
  }));
  await page.getByLabel('Message').fill('hi');
  await page.getByLabel('Message').press('Enter');
  await expect(page.getByRole('log')).toContainText('<img src=x onerror="window.__pwned=1"> hello');
  await expect(page.getByRole('log').locator('img')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined();
});

test('history survives a reload', async ({ page }) => {
  await mockGemini(page, () => ({ body: geminiText('Sure!') }));
  await page.getByLabel('Message').fill('Hello');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('log')).toContainText('Sure!');
  await page.reload();
  await expect(page.getByRole('log')).toContainText('Hello');
  await expect(page.getByRole('log')).toContainText('Sure!');
});

test('a failed reply keeps the question and explains the problem', async ({ page }) => {
  await mockGemini(page, () => ({
    status: 503,
    body: { error: { code: 503, message: 'overloaded' } },
  }));
  await page.getByLabel('Message').fill('Hello');
  await page.getByLabel('Message').press('Enter');
  await expect(page.getByText('Something went wrong. Try again.')).toBeVisible();
  await expect(page.getByRole('log')).toContainText('Hello');
});
