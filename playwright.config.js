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
// Naming template for 'user-crud-parallel-create'/'user-crud-delete-dependent'.
// These projects run their scenarios concurrently, in separate workers, so a
// single shared session would let one worker's request invalidate another's
// in-flight CSRF/session token. The `storageState` fixture override in
// tests/step-definitions/fixtures.js derives a distinct
// `${storagePathParallel}-worker<N>.json` file per worker from this path,
// logging in fresh the first time each worker needs one - this file itself
// is never created directly.
const storagePathParallel = path.resolve(__dirname, `storage/${environment}-auth-parallel.json`);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir,
  /* Default 30s is too tight for multi-step scenarios (login -> dashboard ->
     logout -> login page) against this live, externally-hosted demo site. */
  timeout: 60000,
  /* Run all tests in parallel by default. playwright-bdd's built-in
     `@mode:serial` tag (see features/user-management/user-management-e2e.feature)
     compiles to `test.describe.configure({ mode: 'serial' })` in that file's
     generated spec, which hard-overrides this setting for that one feature -
     its scenarios still run in strict order, in a single worker, sharing one
     browser session via a worker-scoped fixture. Every other feature (no
     @mode:serial tag) runs fully parallel under this global default, so we
     don't need separate projects just to get per-file parallelism. */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 2,
  /* Reporters to use. See https://playwright.dev/docs/test-reporters
     - 'html': Playwright's own report, at the compiled-spec level.
     - 'playwright-bdd/reporter/cucumber' ($type: 'html'): a Cucumber-style
       report built from the same run, showing results at Feature > Scenario
       > Gherkin-step level with tag grouping (@smoke/@regression/@sit/...) -
       the natural reporting view for a BDD suite. */
  reporter: [
    ['html'],
    ['playwright-bdd/reporter/cucumber', { $type: 'html', outputFile: 'cucumber-report/index.html' }],
  ],
 
  /* Default assertion timeout is 5s, which is too tight for this live,
     externally-hosted OrangeHRM demo under real network latency and was
     causing intermittent toBeVisible() timeouts on otherwise-correct
     locators. */
  expect: {
    timeout: 15000,
  },

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on',
    screenshot:'only-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  /* Configure projects: a "setup" project logs in once and saves storageState,
     the browser projects depend on it and reuse the saved session. */
  projects: [
    {
      name: 'setup',
      testDir: path.resolve(__dirname, 'tests/setup'),
      testMatch: /.*\.setup\.js/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: storagePath },
      dependencies: ['setup'],
      // Scenario A/B/C (@parallel-create, @delete-dependent) already run via
      // their own dedicated projects below - exclude them here so they are
      // not executed a second, redundant time under 'chromium'.
      grepInvert: /@parallel-create|@delete-dependent/,
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

    /* System User CRUD - Parallel Create/Update with Dependent API Delete
       (features/user-management/user-crud-parallel.feature). TC-001 and
       TC-002 (tag @parallel-create) run independently, in parallel, using
       this project's own workers (fullyParallel overridden to true here even
       though the suite default above is false). */
    {
      name: 'user-crud-parallel-create',
      // storagePathParallel is only a naming template here - the actual
      // per-worker session file is created lazily by the `storageState`
      // fixture override (see tests/step-definitions/fixtures.js). Each of
      // this project's workers gets its own independently-authenticated
      // session rather than storagePath, since its scenarios run
      // concurrently (with each other, and with 'chromium') against the
      // same live, shared OrangeHRM demo - sharing one session let one
      // worker's request invalidate another's in-flight CSRF/session token,
      // causing silent Save failures.
      use: { ...devices['Desktop Chrome'], storageState: storagePathParallel },
      dependencies: ['setup'],
      grep: /@parallel-create/,
      fullyParallel: true,
    },

    /* TC-003 (tag @delete-dependent) reads the hand-off files written by
       TC-001/TC-002, so it must only start once BOTH have finished. Declaring
       'user-crud-parallel-create' as a dependency (in addition to 'setup')
       enforces that hard ordering regardless of worker/parallelism settings -
       tag filtering alone would not guarantee it. */
    {
      name: 'user-crud-delete-dependent',
      // Same per-worker session mechanism as 'user-crud-parallel-create' -
      // this project has no ordering dependency on 'chromium' either, so it
      // can still run concurrently with it.
      use: { ...devices['Desktop Chrome'], storageState: storagePathParallel },
      dependencies: ['setup', 'user-crud-parallel-create'],
      grep: /@delete-dependent/,
    },
  ],
});
