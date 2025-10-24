import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('DOCX Upload Test', () => {
  test('should upload and extract DOCX file successfully', async ({ page }) => {
    console.log('=== DOCX UPLOAD TEST ===')

    // Navigate to login page
    console.log('Step 1: Logging in...')
    await page.goto('http://localhost:3001/auth/login')
    await page.click('text=Use password instead')
    await page.fill('[name="email"]', 'test@playwright.local')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button:has-text("Sign in with password")')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log('✅ Logged in successfully')

    // Upload DOCX file
    console.log('\nStep 2: Uploading DOCX file...')
    const docxFilePath = path.join(process.cwd(), 'Sample documents', '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(docxFilePath)

    // Wait for upload progress indicator
    console.log('  Waiting for upload to start...')
    await expect(page.getByText('Uploading file...')).toBeVisible({ timeout: 5000 })

    // Wait for extraction progress
    console.log('  Waiting for text extraction...')
    await expect(page.getByText('Extracting text from document...')).toBeVisible({ timeout: 10000 })

    // Wait for success message with character count
    console.log('  Waiting for success message...')
    const successMessage = page.getByText(/Successfully extracted \d+ characters/)
    await expect(successMessage).toBeVisible({ timeout: 60000 })

    // Extract and verify character count
    const messageText = await successMessage.textContent()
    const charCount = messageText?.match(/(\d+) characters/)?.[1]
    console.log(`\n✅ DOCX file uploaded and extracted ${charCount} characters`)

    // Verify we extracted a reasonable amount of text (should be > 1000 chars for a contract)
    expect(parseInt(charCount || '0')).toBeGreaterThan(1000)

    console.log('✅ Test passed!')
  })
})
