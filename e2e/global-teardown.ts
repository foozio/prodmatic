import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  try {
    // Cleanup test data if needed
    console.log('🗑️ Cleaning up test data...');
    
    // Example: Delete test organization via API
    // const browser = await chromium.launch();
    // const page = await browser.newPage();
    // await page.request.delete('/api/organizations/e2e-test-org');
    // await browser.close();
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;