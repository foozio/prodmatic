import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should show homepage when authenticated', async ({ page }) => {
    // Skip this test in CI since we don't have a seeded database
    test.skip(!!process.env.CI, 'Requires seeded database');
    
    // This test assumes you have seeded data and can authenticate
    await page.goto('/auth/signin');
    
    // Fill in credentials (would use test user)
    await page.fill('input[type=\"email\"]', 'admin@prodmatic.com');
    await page.fill('input[type=\"password\"]', 'password123');
    await page.click('button[type=\"submit\"]');
    
    // Should redirect to organization dashboard
    await expect(page).toHaveURL(/.*\/orgs\/.*/);
    
    // Check dashboard elements
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Products')).toBeVisible();
    await expect(page.locator('text=New Ideas')).toBeVisible();
  });

  test('should navigate through main sections', async ({ page }) => {
    test.skip(!!process.env.CI, 'Requires authenticated session');
    
    // Assuming authenticated state
    await page.goto('/orgs/acme-corp');
    
    // Test sidebar navigation
    await page.click('text=Products');
    await expect(page).toHaveURL(/.*\/products/);
    
    await page.click('text=Ideas');
    await expect(page).toHaveURL(/.*\/ideas/);
    
    await page.click('text=Roadmap');
    await expect(page).toHaveURL(/.*\/roadmap/);
    
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/.*\/analytics/);
  });
});