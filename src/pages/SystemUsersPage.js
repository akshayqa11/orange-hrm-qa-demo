const { expect } = require('@playwright/test');

class SystemUsersPage {
  constructor(page) {
    this.page = page;
    this.pageHeading = page.getByRole('heading', { name: 'System Users' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    this.usernameFilter = page
      .locator('.oxd-table-filter .oxd-input-group')
      .filter({ hasText: 'Username' })
      .locator('input');
    this.userRoleFilter = page.locator('.oxd-table-filter').getByText('-- Select --').first();
    this.employeeNameFilter = page.getByPlaceholder('Type for hints...');
    this.statusFilter = page.locator('.oxd-table-filter').getByText('-- Select --').last();

    this.recordsFoundLabel = page.locator('.orangehrm-horizontal-padding.orangehrm-vertical-padding span').first();
    this.tableRows = page.locator('.oxd-table-card');
  }

  async verifyLoaded() {
    await expect(this.page).toHaveURL(/\/admin\/viewSystemUsers/);
    await expect(this.pageHeading).toBeVisible();
    await expect(this.addButton).toBeVisible();
    await expect(this.searchButton).toBeVisible();
    await expect(this.resetButton).toBeVisible();
  }

  async clickAdd() {
    const responsePromise = this.page.waitForURL('**/admin/saveSystemUser');
    await this.addButton.click();
    await responsePromise;
  }

  async searchByUsername(username) {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/v2/admin/users') && response.request().method() === 'GET'
    );
    await this.usernameFilter.fill(username);
    await this.searchButton.click();
    return responsePromise;
  }

  async populateAllFilters({ username, userRole, employeeSearchTerm, status }) {
    await this.usernameFilter.fill(username);

    await this.userRoleFilter.click();
    await this.page.getByRole('option', { name: userRole }).click();

    await this.employeeNameFilter.fill(employeeSearchTerm);
    await this.page.waitForTimeout(500);

    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
  }

  async clickReset() {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/v2/admin/users') && response.request().method() === 'GET'
    );
    await this.resetButton.click();
    return responsePromise;
  }

  async getRecordsFoundText() {
    return this.recordsFoundLabel.textContent();
  }

  getRowByUsername(username) {
    return this.tableRows.filter({ hasText: username });
  }

  async clickEditForUsername(username) {
    const row = this.getRowByUsername(username);
    // The Actions column renders Delete (trash icon) BEFORE Edit (pencil
    // icon) — target the pencil explicitly to avoid ever hitting Delete.
    const editButton = row.locator('button:has(i.bi-pencil-fill)');
    await editButton.click();
  }
}

module.exports = SystemUsersPage;
