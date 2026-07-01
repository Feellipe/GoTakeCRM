import { test, expect } from '@playwright/test';

test.describe('Sidebar Navigation', () => {
  // All nav items and their expected URLs + header titles
  const navLinks = [
    { label: 'Dashboard', url: /\/dashboard/, header: 'Dashboard' },
    { label: 'Clients', url: /\/clients/, header: 'Clients' },
    { label: 'Pipeline', url: /\/pipeline/, header: 'Pipeline' },
    { label: 'Proposals', url: /\/proposals/, header: 'Proposals' },
    { label: 'Financials', url: /\/financials/, header: 'Financials' },
    { label: 'Calendar', url: /\/calendar/, header: 'Calendar' },
  ];

  for (const { label, url, header } of navLinks) {
    test(`navigates to ${label} via sidebar link`, async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Click the nav link in the sidebar
      await page.locator(`.bg-sidebar-glass a:has-text("${label}")`).click();
      await page.waitForURL(url, { timeout: 10000 });

      // Verify we're on the right page — header should contain the title
      await expect(page.locator('h1')).toContainText(new RegExp(header, 'i'));
    });
  }

  test('sidebar mini mode (w-20) — icon-only navigation still works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar is always w-20 on desktop (lg:w-20) — already in mini/icon-only mode
    // No collapse toggle exists on desktop

    // Each nav link has an icon — clicking it should still navigate
    // In mini mode, the <a> is still there with just the icon
    await page.locator('.bg-sidebar-glass a[href="/clients"]').click();
    await page.waitForURL(/\/clients/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Clients');
  });
});
