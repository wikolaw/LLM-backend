import { test, expect } from '@playwright/test'

test.describe('Batch Actions (Clone & Delete)', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/auth/login')
    await page.waitForLoadState('networkidle')

    const usePasswordButton = page.locator('text=Use password instead')
    if (await usePasswordButton.isVisible()) {
      await usePasswordButton.click()
      await page.waitForTimeout(500)
    }

    await page.fill('input[type="email"]', 'test@playwright.local')
    await page.fill('input[type="password"]', 'TestPassword123!')

    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ])

    await page.waitForTimeout(1000)
  })

  test('Clone & Edit functionality', async ({ page }) => {
    console.log('🔍 Testing Clone & Edit...')

    // Navigate to batches
    await page.goto('http://localhost:3001/batches')
    await page.waitForLoadState('networkidle')

    // Get first batch
    const firstBatch = page.locator('tbody tr').first()
    const batchName = await firstBatch.locator('td').first().textContent()
    console.log(`📦 Found batch: ${batchName}`)

    // Click the batch name or the View button to navigate to detail page
    const batchNameLink = firstBatch.locator('td').first()
    await batchNameLink.click()
    await page.waitForLoadState('networkidle')

    // Wait for the batch detail page to load
    await page.waitForTimeout(2000)

    // Wait for Clone & Edit button to be visible (with longer timeout)
    const cloneButton = page.locator('button:has-text("Clone & Edit")')
    try {
      await cloneButton.waitFor({ state: 'visible', timeout: 10000 })
      console.log(`🔘 Clone & Edit button visible: true`)
    } catch (e) {
      console.log('❌ Clone & Edit button not found after 10 seconds!')
      await page.screenshot({ path: 'test-results/clone-button-not-found.png' })

      // Debug: print page content
      const pageContent = await page.content()
      console.log('Page content snippet:', pageContent.substring(0, 500))

      throw new Error('Clone & Edit button not visible after waiting 10 seconds')
    }

    // Click Clone & Edit
    console.log('🖱️ Clicking Clone & Edit...')
    await cloneButton.click()

    // Wait for navigation
    await page.waitForTimeout(2000)

    // Check current URL
    const currentUrl = page.url()
    console.log(`📍 Current URL: ${currentUrl}`)

    // Check for error message
    const errorBanner = page.locator('text=Failed to load batch configuration')
    const hasError = await errorBanner.isVisible().catch(() => false)

    if (hasError) {
      console.log('❌ Error banner visible: Failed to load batch configuration')

      // Take screenshot
      await page.screenshot({ path: 'test-results/clone-edit-error.png' })

      throw new Error('Clone & Edit failed with error banner')
    }

    // Check if we're on dashboard with cloneFrom parameter
    expect(currentUrl).toContain('/dashboard')
    expect(currentUrl).toContain('cloneFrom=')

    // Check for loading indicator or pre-filled data
    const loadingIndicator = page.locator('text=Loading batch configuration')
    const isLoading = await loadingIndicator.isVisible().catch(() => false)
    console.log(`⏳ Loading indicator visible: ${isLoading}`)

    if (isLoading) {
      console.log('⏳ Waiting for configuration to load...')
      await page.waitForTimeout(5000)
    }

    // Check if info banner is visible
    const infoBanner = page.locator('text=Cloning batch configuration')
    const hasInfoBanner = await infoBanner.isVisible().catch(() => false)
    console.log(`ℹ️ Info banner visible: ${hasInfoBanner}`)

    // Wait for data to load
    await page.waitForTimeout(2000)

    // Check if we're on step 2 (Configure Extraction)
    const step2Header = page.locator('h2:has-text("2. Configure Extraction")')
    const isOnStep2 = await step2Header.isVisible().catch(() => false)
    console.log(`📍 On step 2 (Configure Extraction): ${isOnStep2}`)

    // Check document count
    const documentCountText = await page.locator('text=/\\d+ documents? uploaded/').textContent().catch(() => '')
    console.log(`📄 Document count: ${documentCountText}`)

    // Check for infinite loop error in console
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Check for React error overlay
    const reactErrorOverlay = page.locator('[data-nextjs-dialog-overlay]')
    const hasReactError = await reactErrorOverlay.isVisible().catch(() => false)
    if (hasReactError) {
      console.log('❌ React error overlay detected!')
      const errorText = await page.locator('[data-nextjs-dialog-overlay]').textContent()
      console.log(`Error: ${errorText}`)
      await page.screenshot({ path: 'test-results/clone-edit-react-error.png' })
      throw new Error('React error detected: ' + errorText)
    }

    // Check if batch name is populated with (Copy)
    const batchNameInput = page.locator('input[placeholder*="Batch"]').first()
    const batchNameValue = await batchNameInput.inputValue().catch(() => '')
    const hasCopyInName = batchNameValue.includes('(Copy)')
    console.log(`📛 Batch name: ${batchNameValue}, has (Copy): ${hasCopyInName}`)

    // Check if optimized prompt is visible and populated
    const optimizedPromptSection = page.locator('text=Optimized Extraction Prompt')
    const hasOptimizedPrompt = await optimizedPromptSection.isVisible().catch(() => false)
    console.log(`📝 Optimized prompt section visible: ${hasOptimizedPrompt}`)

    // Check if JSON schema is visible
    const jsonSchemaSection = page.locator('text=JSON Schema for Validation')
    const hasJsonSchema = await jsonSchemaSection.isVisible().catch(() => false)
    console.log(`📋 JSON Schema section visible: ${hasJsonSchema}`)

    // Validate that we're on the correct step
    if (!isOnStep2) {
      console.log('❌ Not on step 2 (Configure Extraction)!')
      await page.screenshot({ path: 'test-results/clone-edit-wrong-step.png' })
      throw new Error('Clone & Edit failed: Not on configuration step')
    }

    // Validate batch name has (Copy)
    if (!hasCopyInName) {
      console.log('❌ Batch name does not contain (Copy)!')
      await page.screenshot({ path: 'test-results/clone-edit-no-copy.png' })
      throw new Error('Clone & Edit failed: Batch name missing (Copy) suffix')
    }

    // Validate optimized prompt is loaded
    if (!hasOptimizedPrompt) {
      console.log('❌ Optimized prompt section not visible!')
      await page.screenshot({ path: 'test-results/clone-edit-no-prompt.png' })
      throw new Error('Clone & Edit failed: Optimized prompt not loaded')
    }

    // Validate JSON schema is loaded
    if (!hasJsonSchema) {
      console.log('❌ JSON Schema section not visible!')
      await page.screenshot({ path: 'test-results/clone-edit-no-schema.png' })
      throw new Error('Clone & Edit failed: JSON Schema not loaded')
    }

    // Wait a bit to ensure no infinite loops occur
    await page.waitForTimeout(2000)

    // Check for maximum update depth error
    const maxUpdateError = consoleErrors.some(err =>
      err.includes('Maximum update depth exceeded') ||
      err.includes('Too many re-renders')
    )

    if (maxUpdateError) {
      console.log('❌ Infinite loop detected in console!')
      await page.screenshot({ path: 'test-results/clone-edit-infinite-loop.png' })
      throw new Error('Infinite loop detected: Maximum update depth exceeded')
    }

    console.log('✅ Clone & Edit test passed! All fields loaded correctly, no infinite loops.')
  })

  test('Delete batch functionality', async ({ page }) => {
    console.log('🔍 Testing Delete Batch...')

    // Navigate to batches
    await page.goto('http://localhost:3001/batches')
    await page.waitForLoadState('networkidle')

    // Count initial batches
    const initialCount = await page.locator('tbody tr').count()
    console.log(`📊 Initial batch count: ${initialCount}`)

    // Get first batch that's not processing
    const batches = page.locator('tbody tr')
    let targetBatch = null
    let targetBatchName = null

    for (let i = 0; i < Math.min(5, initialCount); i++) {
      const batch = batches.nth(i)
      const statusBadge = batch.locator('.px-2.py-1.rounded-full')
      const status = await statusBadge.textContent()

      if (status && !status.includes('processing')) {
        targetBatch = batch
        targetBatchName = await batch.locator('td').first().textContent()
        console.log(`📦 Selected batch for deletion: ${targetBatchName} (status: ${status})`)
        break
      }
    }

    if (!targetBatch) {
      console.log('⚠️ No non-processing batches found, skipping delete test')
      return
    }

    // Click to open batch detail
    await targetBatch.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Find and click Delete button
    const deleteButton = page.locator('button:has-text("Delete")')
    const deleteButtonVisible = await deleteButton.isVisible()
    console.log(`🔘 Delete button visible: ${deleteButtonVisible}`)

    if (!deleteButtonVisible) {
      console.log('❌ Delete button not found!')
      throw new Error('Delete button not visible')
    }

    console.log('🖱️ Clicking Delete...')
    await deleteButton.click()

    // Wait for confirmation modal
    await page.waitForTimeout(500)

    // Check for modal
    const modal = page.locator('text=Delete Batch?')
    const modalVisible = await modal.isVisible()
    console.log(`📋 Delete confirmation modal visible: ${modalVisible}`)

    if (!modalVisible) {
      console.log('❌ Confirmation modal not found!')
      throw new Error('Delete confirmation modal not visible')
    }

    // Click confirm delete button in modal
    const confirmButton = page.locator('button:has-text("Delete")').last()
    console.log('🖱️ Clicking Confirm Delete...')
    await confirmButton.click()

    // Wait for navigation back to batches list
    console.log('⏳ Waiting for navigation...')
    await page.waitForURL('**/batches', { timeout: 10000 })

    // Wait for page to fully load and data to refresh
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check if we're back on batches page
    const finalUrl = page.url()
    console.log(`📍 Final URL: ${finalUrl}`)

    if (!finalUrl.includes('/batches') || finalUrl.includes('/batches/')) {
      console.log('⚠️ Did not redirect to batches list page')
    }

    // Check if batch count decreased
    const finalCount = await page.locator('tbody tr').count()
    console.log(`📊 Final batch count: ${finalCount}`)

    if (finalCount >= initialCount) {
      console.log('❌ Batch was not deleted! Count did not decrease')

      // Take screenshot
      await page.screenshot({ path: 'test-results/delete-failed.png' })

      throw new Error('Delete failed: batch count did not decrease')
    }

    console.log(`✅ Delete test passed! Batch count decreased from ${initialCount} to ${finalCount}`)
  })
})
