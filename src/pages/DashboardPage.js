const { expect } = require('@playwright/test');

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
    this.adminNavLink = page.getByRole('link', { name: 'Admin' });
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  async verifyLoaded() {
    await expect(this.page).toHaveURL(/\/dashboard\/index/);
    await expect(this.page).toHaveTitle('OrangeHRM');
    await expect(this.dashboardHeading).toBeVisible();
  }

  async goToAdmin() {
    await this.adminNavLink.click();
  }

  async logout() {
    await this.userDropdown.click();

    const logoutResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/auth/logout')
    );
    await this.logoutMenuItem.click();
    return logoutResponsePromise;
  }
}

module.exports = DashboardPage;
