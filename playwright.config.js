// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');
const path = require('path');

/**
 * Load environment variables for the selected environment.
 * Usage: ENV=staging npm test (defaults to "qa")
 */
const environment = process.env.ENV || 'qa';
require('dotenv').config({ path: path.resolve(__dirname, `.env.${environment}`) });

/**
 * Wire playwright-bdd: this tells `bddgen` where to find .feature files and step
 * definitions, and returns the testDir containing the generated spec files.
 * https://www.npmjs.com/package/playwright-bdd
 */
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['tests/step-definitions/**/*.js'],
});

const storagePath = path.resolve(__dirname, `storage/${environment}-auth.json`);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir,
  /* Run tests in files in parallel across workers, but keep scenarios within
     the SAME file running in order, in the same worker. This is required by
     the "User Management End-to-End Workflow" feature (tagged @serial),
     whose scenarios are one continuous, stateful journey that shares a
     single authenticated browser session via a worker-scoped fixture. */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
 
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot:'only-on-failure'
  },

  /* Configure projects: a "setup" project logs in once and saves storageState,
     the browser projects depend on it and reuse the saved session. */
  projects: [
    {
      name: 'setup',
      // testDir must be overridden here: the top-level `testDir` points at
      // playwright-bdd's generated spec dir, which never contains *.setup.js.
      testDir: path.resolve(__dirname, 'tests/setup'),
      testMatch: /.*\.setup\.js/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: storagePath },
      dependencies: ['setup'],
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'], storageState: storagePath },
    //   dependencies: ['setup'],
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'], storageState: storagePath },
    //   dependencies: ['setup'],
    // },
  ],
});
