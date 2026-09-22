const { expect } = require('@playwright/test');

// Shared Page Object for both the "Add User" and "Edit User" forms — OrangeHRM
// renders the same field layout for both (Edit additionally shows a
// "Change Password ?" toggle and pre-populates existing values).
class UserFormPage {
  constructor(page) {
    this.page = page;
    this.addHeading = page.getByRole('heading', { name: 'Add User' });
    this.editHeading = page.getByRole('heading', { name: 'Edit User' });

    this.userRoleDropdown = page.locator('.oxd-select-text').first();
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.statusDropdown = page.locator('.oxd-select-text').nth(1);
    this.usernameInput = page.locator('.oxd-input-group').filter({ hasText: 'Username' }).locator('input');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.requiredErrors = page.getByText('Required', { exact: true });
    this.passwordMismatchError = page.getByText('Passwords do not match');
    this.toastMessage = page.locator('.oxd-toast-content');
  }

  async verifyAddFormLoaded() {
    await expect(this.page).toHaveURL(/\/admin\/saveSystemUser$/);
    await expect(this.addHeading).toBeVisible();
  }

  async verifyEditFormLoaded(userId) {
    if (userId) {
      await expect(this.page).toHaveURL(new RegExp(`/admin/saveSystemUser/${userId}$`));
    }
    await expect(this.editHeading).toBeVisible();
  }

  async submitEmpty() {
    await this.saveButton.click();
  }

  async selectUserRole(role) {
    await this.userRoleDropdown.click();
    await this.page.getByRole('option', { name: role }).click();
  }

  async selectEmployee(searchTerm) {
    // Type character-by-character (not `fill`) so the app's real keyup-driven
    // debounce/suggestion logic fires exactly as it does for a real user.
    const suggestionsResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/v2/pim/employees') && response.request().method() === 'GET'
    );
    await this.employeeNameInput.pressSequentially(searchTerm, { delay: 50 });

    // Wait for the actual suggestions API call to resolve before reading the
    // list. Without this, the list can still be showing a transient/stale
    // render (e.g. a "Loading..." placeholder or the pre-debounce state) when
    // we click, and OrangeHRM's autocomplete replaces the option nodes once
    // the real response lands — clicking a node from that stale render is a
    // no-op that leaves the field marked "Invalid".
    await suggestionsResponsePromise;

    const suggestionsList = this.page.getByRole('listbox');
    await suggestionsList.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for a REAL matching suggestion (containing the typed term) rather
    // than the first "option" in the list, which may transiently be a
    // "Loading..." placeholder or a "No Records Found" message.
    const matchingOption = suggestionsList
      .getByRole('option', { name: new RegExp(searchTerm, 'i') })
      .first();
    await matchingOption.waitFor({ state: 'visible', timeout: 10000 });
    await matchingOption.click();

    // The app briefly marks the field "Invalid" until it re-validates the
    // selection; wait for that transient state to clear before moving on.
    await expect(this.page.getByText('Invalid', { exact: true })).toHaveCount(0, { timeout: 5000 });
  }

  async selectStatus(status) {
    await this.statusDropdown.click();
    await this.page.getByRole('option', { name: status }).click();
  }

  async fillUsername(username) {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password) {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
  }

  async save() {
    await this.saveButton.click();
  }

  async saveAndCaptureCreateResponse() {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/v2/admin/users') && response.request().method() === 'POST'
    );
    await this.saveButton.click();
    return responsePromise;
  }

  async saveAndCaptureUpdateResponse() {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/v2/admin/users/') && response.request().method() === 'PUT'
    );
    await this.saveButton.click();
    return responsePromise;
  }
}

module.exports = UserFormPage;
