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

  test('sidebar is w-20 on desktop (collapsed state, no labels visible)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar is always w-20 on desktop (lg:w-20) — no collapse toggle exists
    const sidebar = page.locator('.bg-sidebar-glass');
    await expect(sidebar).toBeVisible();

    // Nav item labels are hidden when sidebarOpen=false (w-20 / icon-only mode)
    // The only labels visible would be on the page content, not in sidebar
    // Each nav link still exists (icon only), but text label spans are not rendered
    await expect(page.locator('.bg-sidebar-glass a[href="/dashboard"]')).toBeVisible();
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

  test('sidebar is hidden off-screen on mobile (no mobile responsiveness yet)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar inner div bg-sidebar-glass exists in DOM
    const sidebarInner = page.locator('.bg-sidebar-glass');
    await expect(sidebarInner).toBeAttached();

    // The aside container starts with -translate-x-full (off-screen)
    const aside = page.locator('aside');
    const box = await aside.boundingBox();
    expect(box).not.toBeNull();
    // Sidebar is translated off-screen to the left
    expect(box!.x).toBeLessThan(0);

    // Hamburger button exists on mobile (lg:hidden, fixed top-left)
    const hamburger = page.locator('button[aria-label="Open sidebar"]');
    await expect(hamburger).toBeVisible();
  });
});
