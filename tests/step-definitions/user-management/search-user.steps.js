const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures');
const SystemUsersPage = require('../../../src/pages/SystemUsersPage');
const { readData } = require('../../../src/utils/dataReader');
const { generateSearchTerm } = require('../../../src/utils/dataGenerator');

const { newSystemUser } = readData('users.json');

When("the user searches by the created user's username", async ({ sharedPage, apiState, userContext }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  apiState.searchResponse = await systemUsersPage.searchByUsername(userContext.createdUser.username);
});

Then('exactly one matching record should be found', async ({ sharedPage, apiState }) => {
  const body = await apiState.searchResponse.json();
  expect(body.meta.total).toBe(1);

  const systemUsersPage = new SystemUsersPage(sharedPage);
  const recordsText = await systemUsersPage.getRecordsFoundText();
  expect(recordsText).toContain('(1) Record Found');
});

Then("the matching record's details should match the created user", async ({ sharedPage, userContext }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  const row = systemUsersPage.getRowByUsername(userContext.createdUser.username);
  await expect(row).toBeVisible();
  await expect(row).toContainText(userContext.createdUser.username);
  await expect(row).toContainText(userContext.createdUser.userRole);
});

When('the user searches by a non-existent username', async ({ sharedPage, apiState }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  apiState.negativeSearchResponse = await systemUsersPage.searchByUsername(generateSearchTerm());
});

Then('no records should be found', async ({ sharedPage, apiState }) => {
  const body = await apiState.negativeSearchResponse.json();
  expect(body.data).toHaveLength(0);
  expect(body.meta.total).toBe(0);

  const systemUsersPage = new SystemUsersPage(sharedPage);
  const recordsText = await systemUsersPage.getRecordsFoundText();
  expect(recordsText).toContain('No Records Found');
  await expect(systemUsersPage.tableRows).toHaveCount(0);
});

Given('the user populates all search filters on the System Users list', async ({ sharedPage, userContext }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await systemUsersPage.populateAllFilters({
    username: userContext.createdUser.username,
    userRole: newSystemUser.userRole,
    employeeSearchTerm: newSystemUser.employeeSearchTerm,
    status: newSystemUser.status,
  });

  await expect(systemUsersPage.usernameFilter).toHaveValue(userContext.createdUser.username);
});

When('the user clicks the Reset button', async ({ sharedPage, apiState }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  apiState.resetResponse = await systemUsersPage.clickReset();
});

Then('all search filters should be cleared', async ({ sharedPage }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await expect(systemUsersPage.usernameFilter).toHaveValue('');
  await expect(systemUsersPage.employeeNameFilter).toHaveValue('');
});

Then('the full unfiltered user list should be restored', async ({ apiState }) => {
  expect(apiState.resetResponse.status()).toBe(200);
  const url = apiState.resetResponse.url();
  expect(url).not.toContain('username=');
});
