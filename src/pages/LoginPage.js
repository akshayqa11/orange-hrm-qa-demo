const { baseURL } = require('../../config/env');
const { expect } = require('@playwright/test');


class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.loginHeading = page.getByRole('heading', { name: 'Login' });
    this.requiredErrors = page.getByText('Required', { exact: true });
    this.invalidCredentialsAlert = page.getByRole('alert').filter({ hasText: 'Invalid credentials' });
  }

  async navigate() {
    // Always start from a clean, unauthenticated session, 
    await this.page.context().clearCookies();
    // 'domcontentloaded' rather than the default 'load': this site's full
    // load event (all images/fonts/analytics) is unreliably slow, but the
    // form elements we interact with are present as soon as the DOM is ready.
    await this.page.goto(`${baseURL}/web/index.php/auth/login`, { waitUntil: 'domcontentloaded' });
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
    // const { expect } = require('@playwright/test');

    await expect(this.page).toHaveTitle('OrangeHRM');
    await expect(this.loginHeading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}

module.exports = LoginPage;
