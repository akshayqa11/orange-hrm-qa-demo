const { test: base, createBdd } = require('playwright-bdd');

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
