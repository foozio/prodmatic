import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting page before each test
    await page.goto('/');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Check if we're redirected to login
    await expect(page).toHaveURL(/.*auth\/signin/);
    
    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for validation messages
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill in valid test credentials
    await page.getByLabel(/email/i).fill('alice@prodmatic.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/.*orgs\/[^\/]+$/);
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('should display registration form', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Check for registration form elements
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/signin');
    await page.getByLabel(/email/i).fill('alice@prodmatic.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*orgs\/[^\/]+$/);
  });

  test('should display dashboard with stats', async ({ page }) => {
    // Check for main dashboard elements
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    
    // Check for stats cards
    await expect(page.getByText(/products/i)).toBeVisible();
    await expect(page.getByText(/new ideas/i)).toBeVisible();
    await expect(page.getByText(/team members/i)).toBeVisible();
    await expect(page.getByText(/upcoming releases/i)).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    // Click on products navigation
    await page.getByRole('link', { name: /products/i }).first().click();
    
    // Should be on products page
    await expect(page).toHaveURL(/.*products$/);
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible();
  });

  test('should navigate to ideas page', async ({ page }) => {
    // Click on ideas navigation
    await page.getByRole('link', { name: /ideas/i }).first().click();
    
    // Should be on ideas page
    await expect(page).toHaveURL(/.*ideas$/);
    await expect(page.getByRole('heading', { name: /ideas/i })).toBeVisible();
  });

  test('should show user menu and logout', async ({ page }) => {
    // Click on user menu
    await page.getByTestId('user-menu').click();
    
    // Check for menu options
    await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /sign out/i })).toBeVisible();
    
    // Click logout
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth\/signin/);
  });
});

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to products
    await page.goto('/auth/signin');
    await page.getByLabel(/email/i).fill('alice@prodmatic.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*orgs\/[^\/]+$/);
    await page.getByRole('link', { name: /products/i }).first().click();
  });

  test('should display products list', async ({ page }) => {
    // Check for products page elements
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new product/i })).toBeVisible();
    
    // Should show product cards
    await expect(page.getByTestId('product-card')).toBeVisible();
  });

  test('should create new product', async ({ page }) => {
    // Click new product button
    await page.getByRole('button', { name: /new product/i }).click();
    
    // Fill out product form
    await page.getByLabel(/product name/i).fill('Test Product E2E');
    await page.getByLabel(/description/i).fill('This is a test product created by E2E test');
    await page.getByLabel(/vision/i).fill('To test the product creation flow');
    
    // Submit form
    await page.getByRole('button', { name: /create product/i }).click();
    
    // Should redirect to product detail page
    await expect(page).toHaveURL(/.*products\/test-product-e2e$/);
    await expect(page.getByText(/test product e2e/i)).toBeVisible();
  });

  test('should view product details', async ({ page }) => {
    // Click on first product
    await page.getByTestId('product-card').first().click();
    
    // Should be on product detail page
    await expect(page).toHaveURL(/.*products\/[^\/]+$/);
    await expect(page.getByRole('heading')).toBeVisible();
    
    // Check for product navigation tabs
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /ideas/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /features/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /releases/i })).toBeVisible();
  });
});

test.describe('Ideas Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to ideas
    await page.goto('/auth/signin');
    await page.getByLabel(/email/i).fill('alice@prodmatic.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*orgs\/[^\/]+$/);
    
    // Navigate to a product's ideas page
    await page.getByRole('link', { name: /products/i }).first().click();
    await page.getByTestId('product-card').first().click();
    await page.getByRole('tab', { name: /ideas/i }).click();
  });

  test('should display ideas list', async ({ page }) => {
    // Check for ideas page elements
    await expect(page.getByRole('heading', { name: /ideas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new idea/i })).toBeVisible();
  });

  test('should create new idea', async ({ page }) => {
    // Click new idea button
    await page.getByRole('button', { name: /new idea/i }).click();
    
    // Fill out idea form
    await page.getByLabel(/title/i).fill('E2E Test Idea');
    await page.getByLabel(/description/i).fill('This is a test idea created by E2E test');
    await page.getByLabel(/problem/i).fill('Testing the idea creation flow');
    await page.getByLabel(/priority/i).selectOption('HIGH');
    
    // Submit form
    await page.getByRole('button', { name: /submit idea/i }).click();
    
    // Should see success message and new idea in list
    await expect(page.getByText(/idea created successfully/i)).toBeVisible();
    await expect(page.getByText(/e2e test idea/i)).toBeVisible();
  });

  test('should vote on idea', async ({ page }) => {
    // Find first idea and click vote button
    const firstIdea = page.getByTestId('idea-card').first();
    const voteButton = firstIdea.getByRole('button', { name: /vote/i });
    
    // Get initial vote count
    const voteCount = await firstIdea.getByTestId('vote-count').textContent();
    const initialVotes = parseInt(voteCount?.match(/\d+/)?.[0] || '0');
    
    // Click vote
    await voteButton.click();
    
    // Should see increased vote count
    await expect(firstIdea.getByTestId('vote-count')).toContainText(`${initialVotes + 1}`);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to app
    await page.goto('/auth/signin');
    
    // Check mobile layout
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    
    // Login
    await page.getByLabel(/email/i).fill('alice@prodmatic.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check mobile dashboard
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    
    // Check mobile navigation (hamburger menu)
    const mobileMenu = page.getByTestId('mobile-menu-trigger');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.getByTestId('mobile-menu')).toBeVisible();
    }
  });

  test('should work on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/auth/signin');
    await page.getByLabel(/email/i).fill('alice@prodmatic.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check tablet layout
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    
    // Navigation should be visible on tablet
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});