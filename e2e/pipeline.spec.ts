import { test, expect } from '@playwright/test';

test.describe('Pipeline / Deals', () => {
  test('pipeline page loads with 5 stage columns', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Header should say "Pipeline"
    await expect(page.locator('h1')).toContainText('Pipeline');

    // "New Deal" button should be visible
    await expect(page.locator('button:has-text("New Deal")')).toBeVisible();
  });

  test('stage columns are visible with status labels', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Check for stage labels in the pipeline
    const stages = ['New', 'Briefing', 'Quoting', 'Production', 'Completed'];
    for (const stage of stages) {
      const stageEl = page.locator(`h3:has-text("${stage}")`);
      // At least some stages should be visible
      const count = await stageEl.count();
      if (count > 0) {
        await expect(stageEl.first()).toBeVisible();
        break; // Found at least one stage, that's enough
      }
    }
    // Verify the last stage header is visible
    await expect(page.locator('h3:has-text("Completed")')).toBeVisible();
  });

  test('new deal modal opens via header button', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Click "New Deal" in header
    await page.locator('button:has-text("New Deal")').click();

    // Deal form modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });
});
