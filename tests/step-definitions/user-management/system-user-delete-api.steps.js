const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { Given, When, Then } = require('../fixtures');
const { baseURL } = require('../../../config/env');

const handoffDir = path.resolve(process.cwd(), 'tests/.tmp');

function readHandoff(scenarioLabel) {
  const filePath = path.join(handoffDir, `created-user-${scenarioLabel}.json`);
  expect(fs.existsSync(filePath), `Handoff file missing for scenario ${scenarioLabel}: ${filePath}`).toBeTruthy();
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

Given('the handed-off user ids from scenario {string} and scenario {string} are available', async (
  { userContext },
  scenarioA,
  scenarioB
) => {
  userContext.userCrudDelete = { entries: [readHandoff(scenarioA), readHandoff(scenarioB)] };
});

// No UI is driven here - this step only needs `page.request`, which is
// already authenticated via the project's storageState, same as every other
// scenario in this feature.
When('the users are deleted via a direct DELETE API request', async ({ page, userContext, apiState }) => {
  const ids = userContext.userCrudDelete.entries.map((entry) => entry.id);
  apiState.userCrudDeleteResponse = await page.request.delete(`${baseURL}/web/index.php/api/v2/admin/users`, {
    data: { ids },
  });
});

Then('the delete API response should confirm both ids were removed', async ({ apiState, userContext }) => {
  expect(apiState.userCrudDeleteResponse.status()).toBe(200);
  const body = await apiState.userCrudDeleteResponse.json();
  const deletedIds = body.data.map(String);
  for (const entry of userContext.userCrudDelete.entries) {
    expect(deletedIds).toContain(String(entry.id));
  }
});

Then('a follow-up GET request should confirm the users no longer exist', async ({ page, userContext }) => {
  for (const entry of userContext.userCrudDelete.entries) {
    const response = await page.request.get(`${baseURL}/web/index.php/api/v2/admin/users?username=${entry.username}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
  }
});

Then('the handoff files should be cleared', async ({ userContext }) => {
  for (const entry of userContext.userCrudDelete.entries) {
    const filePath = path.join(handoffDir, `created-user-${entry.scenario}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
