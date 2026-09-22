const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures');
const SystemUsersPage = require('../../../src/pages/SystemUsersPage');
const UserFormPage = require('../../../src/pages/UserFormPage');
const { readData } = require('../../../src/utils/dataReader');
const { generateUsername } = require('../../../src/utils/dataGenerator');
const { baseURL } = require('../../../config/env');

const { updatedSystemUser } = readData('users.json');

Given("the user clicks the Edit action for the created user's record", async ({ sharedPage, userContext }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await systemUsersPage.clickEditForUsername(userContext.createdUser.username);
});

Then("the edit form should be displayed pre-populated with the created user's data", async ({
  sharedPage,
  userContext,
}) => {
  const userFormPage = new UserFormPage(sharedPage);
  await userFormPage.verifyEditFormLoaded(userContext.createdUser.id);
  await expect(userFormPage.usernameInput).toHaveValue(userContext.createdUser.username);
});

Given('the user is on the Edit User form for the created user', async ({ sharedPage, userContext }) => {
  const userFormPage = new UserFormPage(sharedPage);
  await userFormPage.verifyEditFormLoaded(userContext.createdUser.id);
});

When('the user updates the username and status and saves', async ({ sharedPage, apiState, userContext }) => {
  const userFormPage = new UserFormPage(sharedPage);
  const newUsername = generateUsername('qaUserUpdated');

  await userFormPage.fillUsername(newUsername);
  await userFormPage.selectStatus(updatedSystemUser.status);

  await expect(userFormPage.usernameInput).toHaveValue(newUsername);

  apiState.updateUserResponse = await userFormPage.saveAndCaptureUpdateResponse();

  userContext.createdUser.previousUsername = userContext.createdUser.username;
  userContext.createdUser.username = newUsername;
  userContext.createdUser.status = updatedSystemUser.status;
});

Then('the update user API response should be successful', async ({ apiState, userContext }) => {
  expect(apiState.updateUserResponse.status()).toBe(200);
  const body = await apiState.updateUserResponse.json();
  expect(body.data.userName).toBe(userContext.createdUser.username);
  expect(body.data.status).toBe(userContext.createdUser.status === 'Enabled');
});

Then('the updated details should appear in the System Users list', async ({ sharedPage, userContext }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await expect(sharedPage).toHaveURL(/\/admin\/viewSystemUsers/);
  const row = systemUsersPage.getRowByUsername(userContext.createdUser.username);
  await expect(row).toBeVisible();
  await expect(row).toContainText(userContext.createdUser.status);
});

Then('the updated user should be retrievable via the API with matching data', async ({ sharedPage, userContext }) => {
  const { id, username, status } = userContext.createdUser;

  const response = await sharedPage.request.get(`${baseURL}/web/index.php/api/v2/admin/users/${id}`);
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.data.userName).toBe(username);
  expect(body.data.status).toBe(status === 'Enabled');
});
