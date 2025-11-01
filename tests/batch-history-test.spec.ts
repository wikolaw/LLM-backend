import { test, expect } from '@playwright/test'

test('Batch History Page', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:3004/auth/login')

  // Wait for page to load
  await page.waitForLoadState('networkidle')

  // Click "Use password instead" if it exists
  const usePasswordButton = page.locator('text=Use password instead')
  if (await usePasswordButton.isVisible()) {
    await usePasswordButton.click()
    await page.waitForTimeout(500) // Wait for password form to appear
  }

  // Fill login form
  await page.fill('input[type="email"]', 'test@playwright.local')
  await page.fill('input[type="password"]', 'TestPassword123!')

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {}), // Auth redirects to dashboard
    page.click('button[type="submit"]')
  ])

  // Wait a moment for auth to settle
  await page.waitForTimeout(1000)

  // Navigate to batch history page
  await page.goto('http://localhost:3004/batches')
  await page.waitForLoadState('networkidle')

  // Check if page title is visible
  await expect(page.locator('h1:has-text("Your Batches")')).toBeVisible()

  // Check if "Create New Batch" button exists
  await expect(page.locator('button:has-text("Create New Batch")')).toBeVisible()

  // Check for batches or empty state
  const emptyState = page.locator('text=No batches yet')
  const batchTable = page.locator('table tbody tr')

  if (await emptyState.isVisible()) {
    console.log('ℹ️ Empty state displayed - no batches found')
    console.log('💡 To see batches: Go to dashboard, upload documents, and run batch processing')
  } else {
    const batchCount = await batchTable.count()
    console.log(`✅ Found ${batchCount} batch(es) in history`)
  }

  console.log('✅ Batch history page loaded successfully!')
})

test('Batch Detail Page', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:3004/auth/login')

  // Wait for page to load
  await page.waitForLoadState('networkidle')

  // Click "Use password instead" if it exists
  const usePasswordButton = page.locator('text=Use password instead')
  if (await usePasswordButton.isVisible()) {
    await usePasswordButton.click()
    await page.waitForTimeout(500) // Wait for password form to appear
  }

  // Fill login form
  await page.fill('input[type="email"]', 'test@playwright.local')
  await page.fill('input[type="password"]', 'TestPassword123!')

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {}), // Auth redirects to dashboard
    page.click('button[type="submit"]')
  ])

  // Wait a moment for auth to settle
  await page.waitForTimeout(1000)

  // Navigate to batch history page
  await page.goto('http://localhost:3004/batches')
  await page.waitForLoadState('networkidle')

  // Check if there are any batches in the table
  const batchRows = page.locator('tbody tr')
  const count = await batchRows.count()

  if (count > 0) {
    // Click on the first batch
    await batchRows.first().click()

    // Wait for navigation
    await page.waitForLoadState('networkidle')

    // Check if we're on a batch detail page
    await expect(page.locator('a:has-text("Back to Batches")')).toBeVisible()

    console.log('✅ Batch detail page loaded successfully!')
  } else {
    console.log('ℹ️ No batches found in history - skipping detail page test')
  }
})
