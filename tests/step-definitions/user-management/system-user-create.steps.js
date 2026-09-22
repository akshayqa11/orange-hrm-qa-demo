const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { Given, When, Then } = require('../fixtures');
const SystemUsersPage = require('../../../src/pages/SystemUsersPage');
const UserFormPage = require('../../../src/pages/UserFormPage');
const { readData } = require('../../../src/utils/dataReader');
const { generateUsername, generatePassword } = require('../../../src/utils/dataGenerator');
const { baseURL } = require('../../../config/env');

const { newSystemUser } = readData('users.json');

// Hand-off scratch dir shared with system-user-delete-api.steps.js. Each
// parallel scenario (A/B) writes its OWN uniquely-named file here, so there
// is never a concurrent read-modify-write race between the two workers.
const handoffDir = path.resolve(process.cwd(), 'tests/.tmp');

Given('the user opens the Add User form from the System Users list', async ({ page }) => {
  const systemUsersPage = new SystemUsersPage(page);
  await page.goto(`${baseURL}/web/index.php/admin/viewSystemUsers`);
  await systemUsersPage.verifyLoaded();
  await systemUsersPage.clickAdd();
  const userFormPage = new UserFormPage(page);
  await userFormPage.verifyAddFormLoaded();
});

When('the user submits the Add User form with unique generated details for scenario {string}', async (
  { page, userContext, apiState },
  scenarioLabel
) => {
  const userFormPage = new UserFormPage(page);
  const username = generateUsername(`qa_${scenarioLabel.toLowerCase()}_`);
  const password = generatePassword();

  userContext.userCrud = {
    scenario: scenarioLabel,
    username,
    password,
    userRole: newSystemUser.userRole,
    status: newSystemUser.status,
  };

  await userFormPage.selectUserRole(newSystemUser.userRole);
  await userFormPage.selectEmployee(newSystemUser.employeeSearchTerm);
  await userFormPage.selectStatus(newSystemUser.status);
  await userFormPage.fillUsername(username);
  await userFormPage.fillPassword(password);

  apiState.userCrudCreateResponse = await userFormPage.saveAndCaptureCreateResponse();
});

Then('the system user create API response should be successful and match the submitted details', async ({
  apiState,
  userContext,
}) => {
  expect(apiState.userCrudCreateResponse.status()).toBe(200);
  const body = await apiState.userCrudCreateResponse.json();
  expect(body.data.userName).toBe(userContext.userCrud.username);
  expect(body.data.status).toBe(userContext.userCrud.status === 'Enabled');
  userContext.userCrud.id = body.data.id;
});

Then('the {string} success toast should be displayed', async ({ page }, message) => {
  const userFormPage = new UserFormPage(page);
  await expect(userFormPage.toastMessage).toBeVisible({ timeout: 5000 });
  await expect(userFormPage.toastMessage).toContainText(message);
});

Then('the created user should appear in the System Users list', async ({ page, userContext }) => {
  const systemUsersPage = new SystemUsersPage(page);
  await expect(page).toHaveURL(/\/admin\/viewSystemUsers/);
  // Filter by username rather than scanning the unfiltered (default-sorted,
  // first-page) table: on this live, shared demo instance with many
  // accumulated users, a freshly-created user can easily fall outside that
  // default result set.
  await systemUsersPage.searchByUsername(userContext.userCrud.username);
  await expect(systemUsersPage.getRowByUsername(userContext.userCrud.username)).toBeVisible();
});

Then("the created user's id should be handed off to the dependent delete scenario as {string}", async (
  { userContext },
  scenarioLabel
) => {
  fs.mkdirSync(handoffDir, { recursive: true });
  const filePath = path.join(handoffDir, `created-user-${scenarioLabel}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      { id: userContext.userCrud.id, username: userContext.userCrud.username, scenario: scenarioLabel },
      null,
      2
    )
  );
});
