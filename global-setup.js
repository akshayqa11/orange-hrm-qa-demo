const { chromium } = require('@playwright/test');
const { baseURL, username, password, storagePath } = require('./src/config/env');
const fs = require('fs');

async function globalSetup() {
  // Skip if session already saved
  if (fs.existsSync(storagePath)) {
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/web/index.php/auth/login`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/index');

  await context.storageState({ path: storagePath });

  await page.close();
  await context.close();
  await browser.close();
}

module.exports = globalSetup;
