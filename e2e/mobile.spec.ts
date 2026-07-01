import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar is hidden off-screen on mobile (translate-x-full)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The sidebar aside starts with -translate-x-full on mobile (hidden off-screen)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeAttached();

    // Sidebar is translated off-screen via -translate-x-full
    // Since the box should have negative x or be off-screen
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    // Sidebar is off-screen to the left (translated by its own width)
    expect(box!.x).toBeLessThan(0);

    // Sidebar inner div has bg-sidebar-glass
    const innerDiv = sidebar.locator('.bg-sidebar-glass');
    await expect(innerDiv).toBeAttached();
  });

  test('hamburger menu button exists on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Hamburger button is fixed top-left, only visible on mobile
    const hamburger = page.locator('button[aria-label="Open sidebar"]');
    await expect(hamburger).toBeVisible();
  });

  test('hamburger opens sidebar overlay on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar starts off-screen
    const sidebar = page.locator('aside');
    let box = await sidebar.boundingBox();
    expect(box).not.toBeNull();

    // Click hamburger to open sidebar
    await page.locator('button[aria-label="Open sidebar"]').click();
    await page.waitForTimeout(500); // Wait for transition

    // Sidebar should now be on-screen with translate-x-0
    box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    // Sidebar should now be at x=0 (visible)
    expect(box!.x).toBe(0);

    // Sidebar width should be w-[66vw] ≈ 247px on 375px viewport
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.width).toBeLessThan(300);

    // Nav labels should now be visible
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('main content is full-width on mobile (sidebar hidden)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Main content should span full width since sidebar is off-screen
    const main = page.locator('main');
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    // Main starts at x=0 (no sidebar offset on mobile)
    expect(mainBox!.x).toBe(0);
    expect(mainBox!.width).toBe(375);
  });
});
