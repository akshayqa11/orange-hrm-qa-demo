const { expect } = require('@playwright/test');
const { When, Then } = require('../fixtures');
const SystemUsersPage = require('../../../src/pages/SystemUsersPage');
const UserFormPage = require('../../../src/pages/UserFormPage');
const { readData } = require('../../../src/utils/dataReader');

const { updatedSystemUser } = readData('users.json');

When('the user opens the Edit form for the just-created scenario {string} user and disables the status', async (
  { page, userContext, apiState },
  scenarioLabel
) => {
  void scenarioLabel;
  const systemUsersPage = new SystemUsersPage(page);
  await systemUsersPage.clickEditForUsername(userContext.userCrud.username);

  const userFormPage = new UserFormPage(page);
  await userFormPage.verifyEditFormLoaded(userContext.userCrud.id);
  await userFormPage.selectStatus(updatedSystemUser.status);

  apiState.userCrudUpdateResponse = await userFormPage.saveAndCaptureUpdateResponse();
  userContext.userCrud.status = updatedSystemUser.status;
});

Then('the system user update API response should be successful and match the updated details', async ({
  apiState,
  userContext,
}) => {
  expect(apiState.userCrudUpdateResponse.status()).toBe(200);
  const body = await apiState.userCrudUpdateResponse.json();
  expect(body.data.userName).toBe(userContext.userCrud.username);
  expect(body.data.status).toBe(userContext.userCrud.status === 'Enabled');
});
