import { test, expect } from '@playwright/test';

test.describe('Homepage and Navigation', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    // Navigate to the root of the application
    await page.goto('/');

    // Should be redirected to /dashboard, which then redirects to /login
    // because user is not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login Page UI', () => {
  test('should display the login page with app logo and name', async ({ page }) => {
    await page.goto('/login');

    // Verify app name/heading
    await expect(page.getByRole('heading', { name: /decision journal/i })).toBeVisible();

    // Verify subtitle
    await expect(page.getByText(/accedi al tuo account/i)).toBeVisible();
  });

  test('should display the login form with correct Italian labels', async ({ page }) => {
    await page.goto('/login');

    // Verify email input exists
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Verify password input exists
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify sign in button with Italian text
    await expect(page.getByRole('button', { name: /^accedi$/i })).toBeVisible();

    // Verify Google sign in button with Italian text
    await expect(page.getByRole('button', { name: /accedi con google/i })).toBeVisible();
  });

  test('should display registration link with Italian text', async ({ page }) => {
    await page.goto('/login');

    // Verify registration text
    await expect(page.getByText(/non hai un account\?/i)).toBeVisible();

    // Verify link to signup page exists with Italian text
    await expect(page.getByRole('link', { name: /registrati/i })).toBeVisible();
  });

  test('should navigate to signup page from login', async ({ page }) => {
    await page.goto('/login');

    // Click the signup link (Italian: Registrati)
    await page.getByRole('link', { name: /registrati/i }).click();

    // Verify navigation to signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should take screenshot of login page', async ({ page }) => {
    await page.goto('/login');

    // Wait for the page to fully load
    await expect(page.getByRole('heading', { name: /decision journal/i })).toBeVisible();

    // Take screenshot (saved to test-results directory)
    await page.screenshot({
      path: 'test-results/login-page-screenshot.png',
      fullPage: true,
    });

    // Verify all main elements are visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^accedi$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /accedi con google/i })).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');

    // Verify the page renders correctly on mobile
    await expect(page.getByRole('heading', { name: /decision journal/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^accedi$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /accedi con google/i })).toBeVisible();

    // Take mobile screenshot (saved to test-results directory)
    await page.screenshot({
      path: 'test-results/login-page-mobile-screenshot.png',
      fullPage: true,
    });
  });
});
