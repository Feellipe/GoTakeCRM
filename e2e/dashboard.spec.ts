import { test, expect } from '@playwright/test';

test.describe('Dashboard - Desktop', () => {
  test('sidebar visible with w-64, contains nav items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar visible with bg-sidebar-glass class (deployed code)
    const sidebar = page.locator('.bg-sidebar-glass');
    await expect(sidebar).toBeVisible();

    // Nav items with labels visible (sidebar defaults to open w-64 on desktop)
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
    await expect(page.locator('text=Clients').first()).toBeVisible();
    await expect(page.locator('text=Pipeline').first()).toBeVisible();
    await expect(page.locator('text=Calendar').first()).toBeVisible();
  });

  test('sidebar collapses to w-20 via toggle', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click toggle (first button with an SVG — X or Menu icon)
    await page.locator('.bg-sidebar-glass button:has(svg)').first().click();
    await page.waitForTimeout(500);

    // Sidebar should now have w-20
    const sidebar = page.locator('.bg-sidebar-glass');
    await expect(sidebar).toHaveClass(/w-20/);
  });

  test('Settings icon exists in user section (not nav)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Settings is a SettingsPanel trigger button at the bottom, not a nav item
    const settingsBtn = page.locator('.bg-sidebar-glass button:has(svg.lucide-settings)');
    await expect(settingsBtn).toBeVisible();
  });

  test('navigates to Clients via sidebar link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.locator('a:has-text("Clients")').first().click();
    await page.waitForURL(/\/clients/, { timeout: 10000 });
    await expect(page.locator('h1, h2').filter({ hasText: /Client/i }).first()).toBeVisible();
  });
});

test.describe('Dashboard - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar is always visible w-64 (no mobile responsiveness yet)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // KNOWN BUG: sidebar consumes most of the 375px viewport
    const sidebar = page.locator('.bg-sidebar-glass');
    await expect(sidebar).toBeVisible();

    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    // w-64 = 256px on a 375px screen (~68% of width)
    expect(box!.width).toBe(256);

    // Menu button (top-left hamburger) does NOT exist yet
    await expect(page.locator('button:has-text("Menu")')).toHaveCount(0);
  });
});
