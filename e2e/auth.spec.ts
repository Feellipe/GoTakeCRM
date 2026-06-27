import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('login with invalid credentials shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');

    // Fill wrong credentials
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');

    // Click submit
    await page.click('button:has-text("Sign in")');

    // Wait for error alert (be specific: data-slot="alert" avoids Next.js route announcer)
    const errorAlert = page.locator('[role="alert"][data-slot="alert"]');
    await expect(errorAlert).toContainText('Invalid email or password');
    // URL should stay at /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('login error: empty email shows validation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');

    // Leave email empty, fill password
    await page.fill('#password', 'demo2026');

    // Click submit — HTML5 required validation should fire
    await page.click('button:has-text("Sign in")');

    // Should still be on login page (form not submitted via HTML5 validation)
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to dashboard after successful login', async ({ page }) => {
    // Clear auth state for this test (start unauthenticated)
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForSelector('#email');

    // Login with valid credentials
    await page.fill('#email', 'demo@gotakecrm.com');
    await page.fill('#password', 'demo2026');
    await page.click('button:has-text("Sign in")');

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('register page shows form fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('input[id="email"]');

    // Form fields exist
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');

    // "Create one" link exists and points to /register
    const createLink = page.locator('a:has-text("Create one")');
    await expect(createLink).toBeVisible();
    await expect(createLink).toHaveAttribute('href', '/register');
  });
});
