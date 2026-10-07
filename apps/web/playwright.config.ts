import { defineConfig, devices } from '@playwright/test';

const phone = { viewport: { width: 390, height: 844 } };
const desktop = { viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Locally the default (half the cores) runs ~8 browsers at once; Firefox then starves and
  // mocked AI replies miss their 5 s waits. Four is faster overall and deterministic.
  workers: process.env.CI ? undefined : 4,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'en-US',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: process.env.CI ? 'pnpm preview' : 'pnpm build && pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium-phone',
      use: { browserName: 'chromium', ...phone, isMobile: true, hasTouch: true },
    },
    { name: 'webkit-phone', use: { ...devices['iPhone 14'], ...phone } },
    { name: 'firefox-phone', use: { browserName: 'firefox', ...phone } },
    { name: 'chromium-desktop', use: { browserName: 'chromium', ...desktop } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', ...desktop } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', ...desktop } },
  ],
});
