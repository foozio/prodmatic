import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Start browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the app to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Check if the app is responsive
    const title = await page.title();
    console.log(`✅ Application is ready. Page title: ${title}`);

    // Setup test data if needed
    // You can make API calls here to seed test data
    console.log('📊 Setting up test data...');
    
    // Example: Create test organization via API
    // const response = await page.request.post('/api/organizations', {
    //   data: {
    //     name: 'E2E Test Organization',
    //     slug: 'e2e-test-org',
    //     description: 'Organization for E2E testing'
    //   }
    // });
    
    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;