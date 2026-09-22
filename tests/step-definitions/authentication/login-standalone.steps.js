const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures');
const LoginPage = require('../../../src/pages/LoginPage');
const DashboardPage = require('../../../src/pages/DashboardPage');
const { readData } = require('../../../src/utils/dataReader');
const { baseURL, username: envUsername, password: envPassword } = require('../../../config/env');

const loginCredentials = readData('login-credentials.json');

function resolveCredential(value, field) {
  if (value === 'from_env') {
    return field === 'username' ? envUsername : envPassword;
  }
  return value;
}

Given('a user is on the Login page', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.verifyLoaded();
});

When('the user clicks the Login button without entering a username or password', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginButton.click();
});

Then('two {string} validation messages are displayed for the Username and Password fields', async ({ page }, message) => {
  const loginPage = new LoginPage(page);
  await expect(loginPage.requiredErrors).toHaveCount(2);
  await expect(loginPage.requiredErrors.first()).toHaveText(message);
});

Then('the user remains on the login page', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(loginPage.loginHeading).toBeVisible();
});

When('the user enters the {string} credentials and clicks the Login button', async ({ page }, credentialSet) => {
  const loginPage = new LoginPage(page);
  const credentials = loginCredentials[credentialSet];
  const response = await loginPage.login(
    resolveCredential(credentials.username, 'username'),
    resolveCredential(credentials.password, 'password')
  );
  expect(response.status()).toBe(302);
});

Then('an {string} error alert is displayed', async ({ page }, message) => {
  const loginPage = new LoginPage(page);
  await expect(loginPage.invalidCredentialsAlert).toBeVisible();
  await expect(loginPage.invalidCredentialsAlert).toHaveText(message);
});

When('the user enters valid credentials and clicks the Login button', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const response = await loginPage.login(envUsername, envPassword);
  expect(response.status()).toBe(302);
});

Then('the user is redirected to the Dashboard page', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.verifyLoaded();
});

Given('a user is logged in with valid credentials and is on the Dashboard page', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  await loginPage.navigate();
  await loginPage.login(envUsername, envPassword);
  await dashboardPage.verifyLoaded();
});

When('the user opens the user dropdown menu and clicks {string}', async ({ page }, menuItem) => {
  void menuItem;
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.logout();
});

Then('the user is redirected to the Login page', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(loginPage.loginHeading).toBeVisible();
});

Then('navigating to a protected page redirects back to the Login page', async ({ page }) => {
  await page.goto(`${baseURL}/web/index.php/pim/viewEmployeeList`);
  await expect(page).toHaveURL(/\/auth\/login/);
});
