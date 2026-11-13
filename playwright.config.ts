import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env.config';

const isCI = !!process.env.CI;

/**
 * Headless by default; pass `--headed` on the CLI (or use the *:headed npm scripts)
 * for visual inspection. No config edits needed to switch modes.
 * The *:headed scripts use one browser and one worker, so only one window is open at a time.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['list'], ['html', { open: 'never' }]],

  metadata: {
    environment: env.ENV,
    baseURL: env.BASE_URL,
  },

  use: {
    baseURL: env.BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // SLOW_MO=500 slows every action by 500ms so headed runs are easy to follow.
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },

  projects: [
    // Logs in once and saves the session (see src/fixtures/authState.ts).
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },

    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] }, dependencies: ['setup'] },
  ],
});
