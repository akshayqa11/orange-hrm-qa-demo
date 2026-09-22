const fs = require('fs');
const path = require('path');
const { test: base, createBdd } = require('playwright-bdd');
const { baseURL, username, password } = require('../../config/env');

// Projects whose scenarios run concurrently, in separate workers, against
// the SAME live OrangeHRM demo (see playwright.config.js). Loading one
// shared storageState file for all of them gives every worker the identical
// session cookie, so one worker's request can invalidate another's
// in-flight CSRF/session token and cause silent form-submission failures.
// The `storageState` override below gives each WORKER its own,
// independently-authenticated session instead.
const PARALLEL_SESSION_PROJECTS = new Set(['user-crud-parallel-create', 'user-crud-delete-dependent']);

/**
 * The "User Management End-to-End Workflow" feature is a single continuous,
 * ordered journey (login -> admin -> create -> search -> edit -> negative
 * search -> reset -> logout) split across multiple Scenarios that must share
 * the SAME browser session and in-memory test data. The Feature is tagged
 * @serial so playwright-bdd runs its scenarios in order, in one worker.
 *
 * To share one authenticated page/session across all of those scenarios
 * (rather than the default per-test page), `sharedPage` and `userContext`
 * are declared with `scope: 'worker'`: they are created once per worker and
 * reused by every step in every scenario that runs in that worker.
 *
 * `sharedPage` intentionally starts from a fresh context with NO storageState
 * so the Login scenarios (TC-001/TC-002) begin unauthenticated, independent
 * of the `setup` project's pre-authenticated storageState used by other
 * (non-BDD) tests in this repo.
 */
const test = base.extend({
  // Not worker-scoped: the built-in `storageState` fixture is test-scoped,
  // and Playwright doesn't allow narrowing a fixture's scope on override.
  // The on-disk cache (fs.existsSync below) still means only the first test
  // to run in a given worker actually performs a login - every later test in
  // that same worker reuses the file it wrote.
  storageState: async ({ browser }, use, testInfo) => {
    const configuredPath = testInfo.project.use.storageState;

    if (!PARALLEL_SESSION_PROJECTS.has(testInfo.project.name) || !configuredPath) {
      await use(configuredPath);
      return;
    }

    const ext = path.extname(configuredPath);
    const perWorkerPath = configuredPath.slice(0, -ext.length) + `-worker${testInfo.parallelIndex}` + ext;

    if (!fs.existsSync(perWorkerPath)) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${baseURL}/web/index.php/auth/login`);
      await page.getByRole('textbox', { name: 'Username' }).fill(username);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForURL('**/dashboard/index');
      await context.storageState({ path: perWorkerPath });
      await context.close();
    }

    await use(perWorkerPath);
  },

  sharedPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await use(page);
      await context.close();
    },
    { scope: 'worker' },
  ],

  // Cross-scenario scratch space (playwright-bdd's equivalent of a Cucumber World):
  // holds data created in one scenario (e.g. the newly created user) that later
  // scenarios in the same journey need to read.
  userContext: [
    async ({}, use) => {
      await use({});
    },
    { scope: 'worker' },
  ],

  // Holds the most recently captured network response(s) for API assertions.
  apiState: [
    async ({}, use) => {
      await use({});
    },
    { scope: 'worker' },
  ],
});

const { Given, When, Then, Before, After } = createBdd(test);

module.exports = { test, Given, When, Then, Before, After };
