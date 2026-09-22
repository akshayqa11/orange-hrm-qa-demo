const { Given, When, Then } = require('../fixtures');
const DashboardPage = require('../../../src/pages/DashboardPage');
const SystemUsersPage = require('../../../src/pages/SystemUsersPage');

When('the user navigates to the Admin User Management page', async ({ sharedPage }) => {
  const dashboardPage = new DashboardPage(sharedPage);
  await dashboardPage.goToAdmin();
});

Then('the System Users page should be displayed with search filters and an Add button', async ({ sharedPage }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await systemUsersPage.verifyLoaded();
});

Given('the user is on the System Users list', async ({ sharedPage }) => {
  const systemUsersPage = new SystemUsersPage(sharedPage);
  await systemUsersPage.verifyLoaded();
});
