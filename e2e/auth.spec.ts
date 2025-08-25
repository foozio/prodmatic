import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to signin when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });

  test('should show signin form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('h1')).toHaveText('ProdMatic');
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    
    // Check form elements
    await expect(page.locator('input[type=\"email\"]')).toBeVisible();
    await expect(page.locator('input[type=\"password\"]')).toBeVisible();
    await expect(page.locator('button[type=\"submit\"]')).toBeVisible();
    
    // Check OAuth buttons
    await expect(page.locator('text=Continue with GitHub')).toBeVisible();
    await expect(page.locator('text=Continue with Google')).toBeVisible();
  });

  test('should show validation errors for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await page.fill('input[type=\"email\"]', 'invalid@email.com');
    await page.fill('input[type=\"password\"]', 'wrongpassword');
    await page.click('button[type=\"submit\"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should redirect to onboarding for new users', async ({ page }) => {
    // This test would require setting up a test database with a user
    // who has no organizations
    test.skip();
  });
});