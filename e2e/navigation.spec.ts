import { test, expect } from '@playwright/test';

test.describe('Sidebar Navigation', () => {
  // All nav items, their hrefs, and expected header titles
  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', header: 'Dashboard' },
    { label: 'Clients', href: '/clients', header: 'Clients' },
    { label: 'Pipeline', href: '/pipeline', header: 'Pipeline' },
    { label: 'Proposals', href: '/proposals', header: 'Proposals' },
    { label: 'Financials', href: '/financials', header: 'Financials' },
    { label: 'Calendar', href: '/calendar', header: 'Calendar' },
  ];

  for (const { label, href, header } of navLinks) {
    test(`navigates to ${label} via sidebar link`, async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // On desktop (w-20 icon-only mode), labels are hidden — use href selector
      await page.locator(`.bg-sidebar-glass a[href="${href}"]`).click();
      await page.waitForURL(new RegExp(href.replace('/', '\\/')), { timeout: 10000 });

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
