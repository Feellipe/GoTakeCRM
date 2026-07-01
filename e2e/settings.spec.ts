import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('settings icon is visible in sidebar nav (icon-only on desktop)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Settings is a nav item that's always rendered as an icon-only link in w-20 mode
    const settingsLink = page.locator('.bg-sidebar-glass a[href="/settings"]');
    await expect(settingsLink).toBeVisible();
  });

  test('clicking settings in nav navigates to /settings page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click settings nav link in sidebar
    const settingsLink = page.locator('.bg-sidebar-glass a[href="/settings"]');
    await settingsLink.click();

    // Settings is a full page, not a dialog/sheet
    await page.waitForURL(/\/settings/, { timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();
  });
});
