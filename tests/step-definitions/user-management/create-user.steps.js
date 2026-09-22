const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures');
const SystemUsersPage = require('../../../src/pages/SystemUsersPage');
const UserFormPage = require('../../../src/pages/UserFormPage');
const { readData } = require('../../../src/utils/dataReader');
const { generateUsername, generatePassword } = require('../../../src/utils/dataGenerator');
const { baseURL } = require('../../../config/env');

const { newSystemUser } = readData('users.json');

Given('the user clicks the "Add" button on the System Users page', async ({ sharedPage }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await systemUsersPage.clickAdd();
  const userFormPage = new UserFormPage(sharedPage);
  await userFormPage.verifyAddFormLoaded();
});

When('the user submits the Add User form without entering any details', async ({ sharedPage }) => {
  const userFormPage = new UserFormPage(sharedPage);
  await userFormPage.submitEmpty();
});

Then('required field validation messages should be displayed', async ({ sharedPage }) => {
  const userFormPage = new UserFormPage(sharedPage);
  await expect(userFormPage.requiredErrors.first()).toBeVisible();
  const count = await userFormPage.requiredErrors.count();
  expect(count).toBeGreaterThanOrEqual(4); // User Role, Employee Name, Status, Username
  await expect(userFormPage.passwordMismatchError).toBeVisible();
});

Then('no user should be created', async ({ sharedPage }) => {
  const userFormPage = new UserFormPage(sharedPage);
  await expect(sharedPage).toHaveURL(/\/admin\/saveSystemUser$/);
  await expect(userFormPage.addHeading).toBeVisible();
});

Given('the user enters valid unique user details in the Add User form', async ({ sharedPage, userContext }) => {
  const userFormPage = new UserFormPage(sharedPage);

  userContext.createdUser = {
    username: generateUsername(),
    password: generatePassword(),
    userRole: newSystemUser.userRole,
    status: newSystemUser.status,
  };

  await userFormPage.selectUserRole(userContext.createdUser.userRole);
  // employeeSearchTerm is intentionally a broad substring (not a specific
  // full name): this runs against a public, shared OrangeHRM demo instance
  // whose employee list is mutated by other users over time, so we select
  // whichever real employee currently exists rather than depending on one
  // specific name staying present.
  await userFormPage.selectEmployee(newSystemUser.employeeSearchTerm);
  await userFormPage.selectStatus(userContext.createdUser.status);
  await userFormPage.fillUsername(userContext.createdUser.username);
  await userFormPage.fillPassword(userContext.createdUser.password);

  await expect(userFormPage.usernameInput).toHaveValue(userContext.createdUser.username);
});

When('the user saves the new user', async ({ sharedPage, apiState }) => {
  const userFormPage = new UserFormPage(sharedPage);
  apiState.createUserResponse = await userFormPage.saveAndCaptureCreateResponse();
});

Then('the create user API response should be successful', async ({ apiState, userContext }) => {
  expect(apiState.createUserResponse.status()).toBe(200);
  const body = await apiState.createUserResponse.json();
  expect(body.data.userName).toBe(userContext.createdUser.username);
  expect(body.data.status).toBe(userContext.createdUser.status === 'Enabled');
  userContext.createdUser.id = body.data.id;
});

Then('a success message should be displayed', async ({ sharedPage }) => {
  const userFormPage = new UserFormPage(sharedPage);
  await expect(userFormPage.toastMessage).toBeVisible({ timeout: 5000 });
});

Then('the new user should appear in the System Users list', async ({ sharedPage, userContext }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await expect(sharedPage).toHaveURL(/\/admin\/viewSystemUsers/);
  await expect(systemUsersPage.getRowByUsername(userContext.createdUser.username)).toBeVisible();
});

Then('the created user should be retrievable via the API with matching data', async ({ sharedPage, userContext }) => {
  const { id, username, status, userRole } = userContext.createdUser;

  const response = await sharedPage.request.get(
    `${baseURL}/web/index.php/api/v2/admin/users?username=${username}`
  );
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.data).toHaveLength(1);
  expect(body.data[0].id).toBe(id);
  expect(body.data[0].userName).toBe(username);
  expect(body.data[0].status).toBe(status === 'Enabled');
  expect(body.data[0].userRole.name).toBe(userRole);
});
