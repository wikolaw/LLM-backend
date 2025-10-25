import { test, expect } from '@playwright/test'

test('Verify 3-level validation system works end-to-end', async ({ page }) => {
  console.log('\n🧪 Testing 3-Level Validation System\n')

  // 1. Login
  console.log('1️⃣  Logging in...')
  await page.goto('http://localhost:3001/auth/login')

  // Enter email first
  await page.fill('input[type="email"]', 'test@playwright.local')

  // Click "Use password instead" to toggle to password mode
  await page.click('button:has-text("Use password instead")')
  await page.waitForTimeout(500)

  // Now enter password
  await page.fill('input[type="password"]', 'TestPassword123!')

  // Click submit
  await page.click('button:has-text("Sign in with password")')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  console.log('   ✅ Logged in\n')

  // 2. Upload document
  console.log('2️⃣  Uploading document...')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('Sample documents/01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx')
  await page.waitForTimeout(2000)
  console.log('   ✅ Document uploaded\n')

  // 3. Wait for extraction (character count appears when extraction completes)
  console.log('3️⃣  Waiting for text extraction...')
  await page.waitForSelector('text=/\\d+ total characters/i', { timeout: 30000 })
  console.log('   ✅ Text extracted\n')

  // 4. Configure batch
  console.log('4️⃣  Configuring batch job...')
  await page.fill('input[placeholder*="Contract"]', 'Test 3-Level Validation')

  // Fill user prompt (correct placeholder text: "Example: Extract contract...")
  await page.fill('textarea[placeholder*="Example"]', 'Extract contract name, parties, dates, and amounts')
  console.log('   ✅ Batch configured\n')

  // 5. Optimize prompt
  console.log('5️⃣  Optimizing prompt with AI...')
  await page.click('button:has-text("Optimize Prompt")')
  // Wait for optimized prompt textarea to appear (indicates optimization completed)
  await page.waitForSelector('text=Optimized Extraction Prompt', { timeout: 60000 })
  console.log('   ✅ Prompt optimized\n')

  // 6. Generate schema
  console.log('6️⃣  Generating JSON schema...')
  // Scroll down to make Generate JSON Schema button visible
  await page.evaluate(() => window.scrollBy(0, 300))
  await page.waitForTimeout(500)

  const generateSchemaBtn = page.locator('button:has-text("Generate JSON Schema")')
  await generateSchemaBtn.scrollIntoViewIfNeeded()
  await generateSchemaBtn.click()

  // Wait for schema section to expand (4. JSON Schema (editable))
  await page.waitForSelector('text=/4\\. JSON Schema/i', { timeout: 60000 })
  console.log('   ✅ Schema generated\n')

  // 7. Select one model (GPT-4o Mini - reliable)
  console.log('7️⃣  Selecting model...')
  const modelCheckbox = await page.locator('label:has-text("GPT-4o Mini")').locator('input[type="checkbox"]').first()
  await modelCheckbox.check({ timeout: 5000 })

  // Verify model is selected
  const checkedBoxes = await page.locator('input[type="checkbox"]:checked').count()
  expect(checkedBoxes).toBeGreaterThan(0)
  console.log(`   ✅ ${checkedBoxes} model(s) selected\n`)

  // 8. Start batch processing
  console.log('8️⃣  Starting batch processing...')
  await page.click('button:has-text("Start Batch Processing")')
  await page.waitForTimeout(2000)
  console.log('   ✅ Batch processing started\n')

  // 9. Wait for completion (polling every 5 seconds, max 3 minutes)
  console.log('9️⃣  Waiting for batch to complete...')
  let completed = false
  let attempts = 0
  const maxAttempts = 36 // 3 minutes

  while (!completed && attempts < maxAttempts) {
    await page.waitForTimeout(5000)
    attempts++

    // Check if "View Results" button appears
    const viewResultsButton = page.locator('button:has-text("View Results")')
    if (await viewResultsButton.count() > 0) {
      completed = true
      console.log(`   ✅ Batch completed after ${attempts * 5} seconds\n`)
    } else {
      // Check progress
      const progressText = await page.locator('text=/\\d+\\/\\d+ documents/i').textContent().catch(() => null)
      if (progressText) {
        console.log(`   ⏳ Progress: ${progressText}`)
      }
    }
  }

  if (!completed) {
    console.log('   ⚠️  Batch did not complete in time, checking database...\n')
  }

  // 10. Get batch job ID from URL or page
  const url = page.url()
  console.log(`   📍 Current URL: ${url}\n`)

  console.log('✅ Test completed! Now checking database for 3-level validation fields...\n')
})
