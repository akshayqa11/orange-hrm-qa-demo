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
    // Callers often invoke this right after a Save redirects here (e.g. Add
    // User -> System Users list); wait for the list itself to be ready
    // first, otherwise fill/click can land mid-navigation on the page we're
    // leaving, the interaction never reaches the real search button, and the
    // response promise below then waits forever for a request that was
    // never sent.
    await expect(this.page).toHaveURL(/\/admin\/viewSystemUsers/);
    await expect(this.searchButton).toBeVisible();

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
    // Filter by username first rather than scanning whatever page of the
    // table happens to be rendered: this is a live, shared demo instance
    // with many accumulated users, so a freshly-created user can easily
    // land outside the default (unfiltered, first-page) result set and the
    // row would otherwise never appear.
    await this.searchByUsername(username);

    const row = this.getRowByUsername(username);
    await expect(row).toBeVisible();
    // The Actions column renders Delete (trash icon) BEFORE Edit (pencil
    // icon) — target the pencil explicitly to avoid ever hitting Delete.
    const editButton = row.locator('button:has(i.bi-pencil-fill)');
    await editButton.click();
  }
}

module.exports = SystemUsersPage;
