import { defineConfig, devices } from '@playwright/test';

import { claimStack } from '#~/stack/claim-stack';

// This checkout's stack slot; the claim lands in the environment, so the stack and every worker use the same one.
const stack = await claimStack();

// Set when `pnpm run e2e:stack` already runs in another terminal, so repeated runs skip the stack boot.
const shouldReuseStack = process.env.E2E_REUSE_STACK === 'true';
const isCi = Boolean(process.env.CI);

const STACK_BOOT_TIMEOUT_MS = 300_000;

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results/playwright',

  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]],

  use: {
    baseURL: stack.webBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  globalSetup: './src/playwright/global-setup.ts',

  // Playwright stops the stack it started at the end of the run; the stack then removes its services.
  webServer: {
    command: 'pnpm run stack',
    url: stack.webBaseUrl,
    timeout: STACK_BOOT_TIMEOUT_MS,
    reuseExistingServer: shouldReuseStack,
    env: stack.environment,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
