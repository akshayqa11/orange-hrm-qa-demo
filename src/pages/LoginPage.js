const { baseURL } = require('../../config/env');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.loginHeading = page.getByRole('heading', { name: 'Login' });
    this.requiredErrors = page.getByText('Required', { exact: true });
  }

  async navigate() {
    // Always start from a clean, unauthenticated session, regardless of any
    // cookies the shared worker page may already carry.
    await this.page.context().clearCookies();
    await this.page.goto(`${baseURL}/web/index.php/auth/login`);
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);

    const loginResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/auth/validate') && response.request().method() === 'POST'
    );
    await this.loginButton.click();
    return loginResponsePromise;
  }

  async verifyLoaded() {
    const { expect } = require('@playwright/test');
    await expect(this.page).toHaveTitle('OrangeHRM');
    await expect(this.loginHeading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}

module.exports = LoginPage;
