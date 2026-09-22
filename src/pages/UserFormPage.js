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
    const suggestionsList = this.page.getByRole('listbox');
    const invalidIndicator = this.page.getByText('Invalid', { exact: true });

    // Type character-by-character (not `fill`) so the app's real keyup-driven
    // debounce/suggestion logic fires exactly as it does for a real user, and
    // wait for the actual suggestions API call to resolve before reading the
    // list. Without this, the list can still be showing a transient/stale
    // render (e.g. a "Loading..." placeholder or the pre-debounce state) when
    // we click, and OrangeHRM's autocomplete replaces the option nodes once
    // the real response lands — clicking a node from that stale render is a
    // no-op that leaves the field marked "Invalid".
    const openSuggestions = async (term) => {
      await this.employeeNameInput.fill('');
      const suggestionsResponsePromise = this.page.waitForResponse(
        (response) => response.url().includes('/api/v2/pim/employees') && response.request().method() === 'GET'
      );
      await this.employeeNameInput.pressSequentially(term, { delay: 50 });
      await suggestionsResponsePromise;
      await suggestionsList.waitFor({ state: 'visible', timeout: 10000 });
    };

    // Try every REAL matching suggestion (excluding transient
    // "Loading..."/"No Records Found" placeholders) for one search term. On
    // this shared public demo instance, OrangeHRM permanently marks the
    // field "Invalid" when the chosen employee already has a System User
    // account — that's a real rejection, not a transient re-validation
    // flicker. Returns true once a selection is accepted.
    const tryTerm = async (term) => {
      await openSuggestions(term);

      const candidateNames = (
        await suggestionsList.getByRole('option', { name: new RegExp(term, 'i') }).allTextContents()
      ).filter((name) => !/^(searching|no records found)/i.test(name));

      for (let i = 0; i < candidateNames.length; i++) {
        if (i > 0) await openSuggestions(term);

        const option = suggestionsList.getByRole('option', { name: candidateNames[i], exact: true });
        const isVisible = await option
          .waitFor({ state: 'visible', timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        if (!isVisible) continue; // suggestion no longer present on this shared instance; try the next one

        await option.click();

        // Give the app a moment to mark the field "Invalid" if this employee
        // already has a System User account; if it doesn't appear, the
        // selection was accepted.
        const rejected = await invalidIndicator
          .waitFor({ state: 'visible', timeout: 1000 })
          .then(() => true)
          .catch(() => false);
        if (!rejected) return true;
      }
      return false;
    };

    // The suggestions endpoint only returns a small, fixed-size slice of
    // matches per query rather than every match, so a single broad search
    // term always surfaces the same handful of employees. After enough
    // automation runs against this shared public demo, that entire slice can
    // already be linked to System User accounts. If so, fall back through
    // other letters to reach a different slice of the employee list instead
    // of failing outright.
    const fallbackLetters = 'eiomnrltsdcgpbhuvwfyjkqxz'
      .split('')
      .filter((letter) => letter !== searchTerm.toLowerCase());
    const termsToTry = [searchTerm, ...fallbackLetters];

    for (const term of termsToTry) {
      if (await tryTerm(term)) return;
    }

    throw new Error(
      `selectEmployee: no employee suggestion across search terms [${termsToTry.join(', ')}] was accepted ` +
        '(likely all already linked to a System User)'
    );
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
