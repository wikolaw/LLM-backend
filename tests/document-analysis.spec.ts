import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * LLM Document Analysis - End-to-End Test
 *
 * Prerequisites:
 * 1. Enable email/password auth in Supabase (see SETUP-TEST-USER.md)
 * 2. Create test user: test@playwright.local / TestPassword123!
 * 3. Dev server running on http://localhost:3000
 * 4. Sample documents in 'Sample documents/' folder
 */

test.describe('LLM Document Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/auth/login')
  })

  test('complete document analysis workflow with Swedish contract', async ({ page }) => {
    // ========================================
    // STEP 1: Login with password
    // ========================================
    console.log('Step 1: Logging in with test credentials...')

    // Click "Use password instead" link
    await page.click('text=Use password instead')

    // Fill in credentials
    await page.fill('[name="email"]', 'test@playwright.local')
    await page.fill('[name="password"]', 'TestPassword123!')

    // Submit login form
    await page.click('button:has-text("Sign in with password")')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log('✓ Successfully logged in')

    // ========================================
    // STEP 2: Upload Document
    // ========================================
    console.log('Step 2: Uploading test document...')

    // Wait for dashboard to load
    await expect(page.locator('h1:has-text("LLM Document Analysis")')).toBeVisible()

    // Find the file input for document upload
    const fileInput = page.locator('input[type="file"]')

    // Upload the test contract file
    const testFilePath = path.join(__dirname, '../Sample documents/test-contract-arlanda.txt')
    await fileInput.setInputFiles(testFilePath)

    // Wait for upload to complete and text extraction
    // Look for the document info to appear
    await expect(page.locator('text=test-contract-arlanda.txt')).toBeVisible({ timeout: 30000 })
    console.log('✓ Document uploaded and text extracted')

    // Verify character count is displayed
    await expect(page.locator('text=/\\d+ characters/')).toBeVisible()

    // ========================================
    // STEP 3: Configure Prompts
    // ========================================
    console.log('Step 3: Configuring prompts...')

    // Wait for Step 2 section to be visible
    await expect(page.locator('h2:has-text("2. Configure Prompts")')).toBeVisible()

    // The default Swedish contract schema should already be selected
    // Verify the schema selector shows "Swedish Contract"
    await expect(page.locator('text=Swedish Contract (Railway Infrastructure)')).toBeVisible()

    // Verify prompts are populated (they should have default values)
    const systemPromptArea = page.locator('textarea').first()
    const systemPromptValue = await systemPromptArea.inputValue()
    expect(systemPromptValue.length).toBeGreaterThan(100)
    console.log('✓ Prompts configured with Swedish contract schema')

    // Click "Next: Select Models"
    await page.click('button:has-text("Next: Select Models")')

    // ========================================
    // STEP 4: Select Models
    // ========================================
    console.log('Step 4: Selecting models...')

    // Wait for Step 3 section to be visible
    await expect(page.locator('h2:has-text("3. Select Models")')).toBeVisible()

    // Select free models for cost-effective testing
    // Click "Select All Free" button if it exists, otherwise select individual models
    const selectFreeButton = page.locator('button:has-text("Select All Free")')
    if (await selectFreeButton.isVisible()) {
      await selectFreeButton.click()
      console.log('✓ Selected all free models')
    } else {
      // Manually select some free models
      await page.check('input[type="checkbox"][value*="llama"]').first()
      await page.check('input[type="checkbox"][value*="mistral"]').first()
      console.log('✓ Selected individual free models')
    }

    // Optionally add one premium model for quality comparison
    // await page.check('input[type="checkbox"][value*="claude"]').first()

    // Wait a moment for model selection to update
    await page.waitForTimeout(1000)

    // ========================================
    // STEP 5: Run Inference
    // ========================================
    console.log('Step 5: Running LLM inference...')

    // Find the "Run X Models" button
    const runButton = page.locator('button:has-text(/Run \\d+ Model/)')
    await expect(runButton).toBeEnabled()

    // Click to start inference
    await runButton.click()

    // Wait for "Running..." state
    await expect(page.locator('text=Running...')).toBeVisible()
    console.log('✓ Inference started...')

    // Wait for inference to complete (can take 30-60 seconds)
    // Look for the progress message to disappear or completion message
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: 120000 })

    // Wait for results section to appear
    await expect(page.locator('h2:has-text("4. View Results")')).toBeVisible({ timeout: 30000 })
    console.log('✓ Inference completed successfully')

    // ========================================
    // STEP 6: Verify Results
    // ========================================
    console.log('Step 6: Verifying results...')

    // Check that we have model output cards
    const outputCards = page.locator('[class*="output-card"], [class*="model-result"]')
    const cardCount = await outputCards.count()
    expect(cardCount).toBeGreaterThan(0)
    console.log(`✓ Found ${cardCount} model results`)

    // Verify at least one result shows valid JSON
    await expect(page.locator('text=Valid JSON').or(page.locator('text=✓'))).toBeVisible()

    // Verify metrics are displayed (execution time, tokens, cost)
    await expect(page.locator('text=/\\d+ms|\\d+s/')).toBeVisible()
    await expect(page.locator('text=/\\d+ tokens/')).toBeVisible()

    // ========================================
    // STEP 7: Export Results (Optional)
    // ========================================
    console.log('Step 7: Testing export functionality...')

    // Find and click the first export button
    const exportButton = page.locator('button:has-text("Export")').first()
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()

      const download = await downloadPromise
      const fileName = download.suggestedFilename()
      expect(fileName).toMatch(/\.json$/)
      console.log(`✓ Export triggered: ${fileName}`)
    }

    // ========================================
    // FINAL: Take screenshot
    // ========================================
    await page.screenshot({
      path: 'tests/screenshots/results-comparison.png',
      fullPage: true
    })
    console.log('✓ Screenshot saved to tests/screenshots/results-comparison.png')

    console.log('\n✅ Complete workflow test passed!')
  })

  test('login page displays test credentials', async ({ page }) => {
    // Verify test credentials are shown on login page
    await expect(page.locator('text=test@playwright.local')).toBeVisible()
    await expect(page.locator('text=TestPassword123!')).toBeVisible()
  })

  test('cannot access dashboard without authentication', async ({ page }) => {
    // Try to access dashboard directly without logging in
    await page.goto('http://localhost:3000/dashboard')

    // Should redirect to login page
    await page.waitForURL('**/auth/login', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })
})

test.describe('Document Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/auth/login')
    await page.click('text=Use password instead')
    await page.fill('[name="email"]', 'test@playwright.local')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button:has-text("Sign in with password")')
    await page.waitForURL('**/dashboard')
  })

  test('upload TXT file successfully', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, '../Sample documents/test-contract-arlanda.txt')
    await fileInput.setInputFiles(testFilePath)

    await expect(page.locator('text=test-contract-arlanda.txt')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text=/\\d+ characters/')).toBeVisible()
  })

  // Add more upload tests for DOCX, PDF, etc.
})

test.describe('Model Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Login and upload document
    await page.goto('http://localhost:3000/auth/login')
    await page.click('text=Use password instead')
    await page.fill('[name="email"]', 'test@playwright.local')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button:has-text("Sign in with password")')
    await page.waitForURL('**/dashboard')

    // Upload document
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, '../Sample documents/test-contract-arlanda.txt')
    await fileInput.setInputFiles(testFilePath)
    await expect(page.locator('text=test-contract-arlanda.txt')).toBeVisible({ timeout: 30000 })

    // Navigate to model selection
    await page.click('button:has-text("Next: Select Models")')
    await expect(page.locator('h2:has-text("3. Select Models")')).toBeVisible()
  })

  test('displays available models grouped by cost', async ({ page }) => {
    // Verify free models section
    await expect(page.locator('text=Free Models')).toBeVisible()

    // Verify at least some model checkboxes are present
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThan(0)
  })

  test('run button disabled when no models selected', async ({ page }) => {
    // Uncheck all models if any are checked
    const checkedBoxes = page.locator('input[type="checkbox"]:checked')
    const checkedCount = await checkedBoxes.count()

    if (checkedCount > 0) {
      await checkedBoxes.first().uncheck()
    }

    // Run button should be disabled
    const runButton = page.locator('button:has-text(/Run \\d+ Model/)')
    await expect(runButton).toBeDisabled()
  })
})
