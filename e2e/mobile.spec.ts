import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar consumes ~68% of viewport (known bug)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar is visible on mobile (bug — should be hidden by default)
    const sidebar = page.locator('.glass-sidebar');
    await expect(sidebar).toBeVisible();

    // w-64 = 256px on 375px viewport
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBe(256);
    expect(box!.width / 375).toBeGreaterThan(0.6); // >60% of screen
  });

  test('no hamburger menu button exists (known bug)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // No menu/hamburger button outside the sidebar (bug)
    // The only toggle button is INSIDE the sidebar
    const menuButtons = page.locator('button:has(svg.lucide-menu)');
    const count = await menuButtons.count();

    if (count > 0) {
      // If there is one, it's inside the sidebar (not outside/fixed)
      const toggleButton = menuButtons.first();
      await expect(toggleButton).toBeVisible();

      // Clicking toggles w-64 ↔ w-20 (not full overlay)
      await toggleButton.click();
      await page.waitForTimeout(500);
      const sidebar = page.locator('.glass-sidebar');
      await expect(sidebar).toHaveClass(/w-20/);
    } else {
      // No toggle button at all (if sidebar is already w-20 somehow)
      console.log('No menu toggle button found on mobile');
    }
  });

  test('content area is pushed right by sidebar width', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The main content starts after the sidebar (no overlay pattern)
    // Main element should have ml-64 equivalent offset
    const main = page.locator('main');
    const mainBox = await main.boundingBox();
    const sidebar = page.locator('.glass-sidebar');
    const sideBox = await sidebar.boundingBox();

    expect(mainBox).not.toBeNull();
    expect(sideBox).not.toBeNull();
    // Content starts at or after sidebar ends
    expect(mainBox!.x).toBeGreaterThanOrEqual(sideBox!.width - 20);
  });
});
