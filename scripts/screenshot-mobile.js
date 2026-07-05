const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const BASE = 'https://gotakecrm-git-demo-feellipes-projects.vercel.app';

  // 1. Login page
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/gotakecrm-01-login.png', fullPage: true });
  console.log('01 - Login page captured');

  // 2. Log in
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill('demo@gotakecrm.com.br');
  const passInput = page.locator('input[type="password"]');
  await passInput.fill('demo2026');
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/gotakecrm-02-dashboard.png', fullPage: true });
  console.log('02 - Dashboard captured');

  await browser.close();
  console.log('Screenshots done!');
})();
