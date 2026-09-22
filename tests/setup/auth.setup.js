const { test: setup } = require('@playwright/test');
const { baseURL, username, password, storagePath } = require('../../config/env');

setup('authenticate', async ({ page }) => {
  await page.goto(`${baseURL}/web/index.php/auth/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/dashboard/index');
  await page.context().storageState({ path: storagePath });
});
