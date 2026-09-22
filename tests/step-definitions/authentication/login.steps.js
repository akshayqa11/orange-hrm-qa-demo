const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures');
const LoginPage = require('../../../src/pages/LoginPage');
const DashboardPage = require('../../../src/pages/DashboardPage');
const { readData } = require('../../../src/utils/dataReader');
const { username: envUsername, password: envPassword } = require('../../../config/env');

const users = readData('users.json');

Given('the user navigates to the application login URL', async ({ sharedPage }) => {
  const loginPage = new LoginPage(sharedPage);
  await loginPage.navigate();
});

Given('the user is on the login page', async ({ sharedPage }) => {
  const loginPage = new LoginPage(sharedPage);
  await loginPage.navigate();
});

Then('the login page should display the expected title, heading, and login form', async ({ sharedPage }) => {
  const loginPage = new LoginPage(sharedPage);
  await loginPage.verifyLoaded();
});

When('the user logs in with valid Admin credentials', async ({ sharedPage, apiState }) => {
  const loginPage = new LoginPage(sharedPage);
  // `users.validUser` marks credentials as "from_env" — actual values always
  // come from config/env.js, never hardcoded here.
  void users.validUser;
  apiState.loginResponse = await loginPage.login(envUsername, envPassword);
});

Then('the login API response should be successful', async ({ apiState }) => {
  expect(apiState.loginResponse).toBeTruthy();
  const status = apiState.loginResponse.status();
  expect([200, 302]).toContain(status);
});

Then('the user should be redirected to the Dashboard', async ({ sharedPage }) => {
  const dashboardPage = new DashboardPage(sharedPage);
  await dashboardPage.verifyLoaded();
});

Given('the user is logged in and on the Dashboard', async ({ sharedPage }) => {
  const dashboardPage = new DashboardPage(sharedPage);
  await dashboardPage.verifyLoaded();
});

Given('the user is logged in', async ({ sharedPage }) => {
  await expect(sharedPage.locator('.oxd-userdropdown-tab')).toBeVisible();
});
