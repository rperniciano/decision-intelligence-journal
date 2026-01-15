import { test, expect } from '@playwright/test';

test.describe('Homepage and Navigation', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    // Navigate to the root of the application
    await page.goto('/');

    // Should be redirected to /dashboard, which then redirects to /login
    // because user is not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display the login page with correct elements', async ({ page }) => {
    // Navigate directly to login page
    await page.goto('/login');

    // Verify page title/heading
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

    // Verify email input exists
    await expect(page.getByLabel(/email address/i)).toBeVisible();

    // Verify password input exists
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify sign in button exists
    await expect(page.getByRole('button', { name: /sign in$/i })).toBeVisible();

    // Verify Google sign in button exists
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();

    // Verify link to signup page exists
    await expect(page.getByRole('link', { name: /create a new account/i })).toBeVisible();
  });

  test('should navigate to signup page from login', async ({ page }) => {
    await page.goto('/login');

    // Click the signup link
    await page.getByRole('link', { name: /create a new account/i }).click();

    // Verify navigation to signup page
    await expect(page).toHaveURL(/\/signup/);
  });
});
