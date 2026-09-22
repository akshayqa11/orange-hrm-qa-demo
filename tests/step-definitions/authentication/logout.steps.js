const { expect } = require('@playwright/test');
const { When, Then } = require('../fixtures');
const DashboardPage = require('../../../src/pages/DashboardPage');
const LoginPage = require('../../../src/pages/LoginPage');
const { baseURL } = require('../../../config/env');

When('the user logs out', async ({ sharedPage, apiState }) => {
  const dashboardPage = new DashboardPage(sharedPage);
  apiState.logoutResponse = await dashboardPage.logout();
});

Then('the logout API response should be successful', async ({ apiState }) => {
  expect(apiState.logoutResponse).toBeTruthy();
  expect([200, 302]).toContain(apiState.logoutResponse.status());
});

Then('the user should be redirected to the login page', async ({ sharedPage }) => {
  const loginPage = new LoginPage(sharedPage);
  await expect(sharedPage).toHaveURL(/\/auth\/login/);
  await expect(loginPage.loginHeading).toBeVisible();
});

Then('protected pages should no longer be accessible', async ({ sharedPage }) => {
  await sharedPage.goto(`${baseURL}/web/index.php/admin/viewSystemUsers`);
  await expect(sharedPage).toHaveURL(/\/auth\/login/);
});
