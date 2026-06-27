import { test, expect } from '@playwright/test';

test.describe('Financials', () => {
  test('financials page loads with tabs', async ({ page }) => {
    await page.goto('/financials');
    await page.waitForLoadState('networkidle');

    // Header should say "Financials"
    await expect(page.locator('h1')).toContainText('Financials');

    // There should be at least some content on the page
    await expect(page.locator('[role="tablist"], button:has-text("Revenue"), button:has-text("Expenses")').first()).toBeVisible();
  });

  test('revenue tab switches content', async ({ page }) => {
    await page.goto('/financials');
    await page.waitForLoadState('networkidle');

    // Look for any tab/button labeled "Revenue"
    const revenueTab = page.locator('button:has-text("Revenue"), [role="tab"]:has-text("Revenue")').first();
    await expect(revenueTab).toBeVisible();

    await revenueTab.click();
    await page.waitForTimeout(1000);

    // Page should still be the financials page
    await expect(page.locator('h1')).toContainText('Financials');
  });

  test('expenses tab switches content', async ({ page }) => {
    await page.goto('/financials');
    await page.waitForLoadState('networkidle');

    // Look for any tab/button labeled "Expenses"
    const expensesTab = page.locator('button:has-text("Expenses"), [role="tab"]:has-text("Expenses")').first();
    await expect(expensesTab).toBeVisible();

    await expensesTab.click();
    await page.waitForTimeout(1000);

    // Page should still be the financials page
    await expect(page.locator('h1')).toContainText('Financials');
  });
});
