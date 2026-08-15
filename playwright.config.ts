import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests.
 *
 * They run against a real build of the app in DEMO_MODE, so no external
 * provider is called and no money moves. Start the app yourself, or let
 * Playwright start it with `webServer` below.
 *
 *   npm run build:web && npm run test:e2e
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start --workspace=@afd/web',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { DEMO_MODE: 'true', NODE_ENV: 'production' },
      },
});
