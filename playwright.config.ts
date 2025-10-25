import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

/**
 * Playwright configuration for LLM Document Analysis tests
 */
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 180 * 1000, // 3 minutes (LLM inference can be slow)

  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  // Reporter settings
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers
  projects: [
    // UI tests (browser-based)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/, // Matches all spec files
      testIgnore: /tests\/(unit|api|edge-functions|e2e)\/.*\.spec\.ts/, // Ignore non-UI tests
    },

    // API tests (no browser, uses request context)
    {
      name: 'api-tests',
      use: {
        baseURL: 'http://localhost:3000',
        // Increase timeout for LLM API calls (prompt optimization, schema generation)
        actionTimeout: 120000, // 2 minutes for API calls
      },
      testMatch: /tests\/(unit|api|edge-functions|e2e)\/.*\.spec\.ts/,
    },

    // Uncomment to test UI on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   testIgnore: /tests\/(unit|api|edge-functions|e2e)\/.*\.spec\.ts/,
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testIgnore: /tests\/(unit|api|edge-functions|e2e)\/.*\.spec\.ts/,
    // },
  ],

  // Run local dev server before tests (optional)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
