import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('settings icon is visible in sidebar user section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Settings is a SettingsPanel trigger in the sidebar user section
    // It appears as a cog/gear icon button
    const settingsBtn = page.locator('.glass-sidebar button:has(svg.lucide-settings)');
    await expect(settingsBtn).toBeVisible();
  });

  test('clicking settings in sidebar opens settings panel', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click settings button in sidebar
    const settingsBtn = page.locator('.glass-sidebar button:has(svg.lucide-settings)');
    await settingsBtn.click();

    // Settings panel should open (it's a Sheet or Dialog)
    await page.waitForTimeout(1000);
    const panel = page.locator('[role="dialog"]');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });
});
