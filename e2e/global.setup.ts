import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'fs/promises';

const AUTH_FILE = '.auth/storageState.json';

setup('login as demo user', async ({ page }) => {
  await page.goto('/login');

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]');

  // Fill credentials
  await page.fill('input[type="email"]', 'demo@gotakecrm.com');
  await page.fill('input[type="password"]', 'demo2026');

  // Click sign in
  await page.click('button:has-text("Sign in")');

  // Wait for navigation — could be /dashboard or /dashboard/...
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  // Wait for DOM to be ready (avoid networkidle which hangs due to SWR polling)
  await page.waitForLoadState('domcontentloaded');

  // Wait for the dashboard sidebar to be visible — confirms the app has rendered
  await expect(page.locator('.glass-sidebar')).toBeVisible({ timeout: 15000 });

  // Confirm we're logged in (no sign-in button on the page)
  await expect(page.locator('button:has-text("Sign in")')).toHaveCount(0);

  // Save auth state
  await mkdir('.auth', { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
