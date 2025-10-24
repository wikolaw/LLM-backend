import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Comprehensive Document Upload Test
 * Tests TXT and DOCX file uploads with the new Vercel API route implementation
 */

test.describe('Document Upload - Final Validation', () => {
  const SERVER_URL = 'http://localhost:3003'

  test.beforeEach(async ({ page }) => {
    console.log('\n🔧 Setting up test...')

    // Navigate to login page
    await page.goto(`${SERVER_URL}/auth/login`)

    // Click "Use password instead" button
    await page.click('text=Use password instead')

    // Fill in login credentials
    await page.fill('[name="email"]', 'test@playwright.local')
    await page.fill('[name="password"]', 'TestPassword123!')

    // Click sign in button
    await page.click('button:has-text("Sign in with password")')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    console.log('✅ Login successful\n')
  })

  test('TXT file upload and extraction', async ({ page }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📄 TEST 1: TXT File Upload')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const txtFilePath = path.join(process.cwd(), 'Sample documents', 'test-contract-arlanda.txt')
    console.log(`📁 File: ${path.basename(txtFilePath)}`)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(txtFilePath)

    console.log('⏳ Waiting for upload...')
    await expect(page.getByText('Uploading file...')).toBeVisible({ timeout: 5000 })

    console.log('⏳ Waiting for text extraction...')
    await expect(page.getByText('Extracting text from document...')).toBeVisible({ timeout: 10000 })

    console.log('⏳ Waiting for success message...')
    const successMessage = page.getByText(/Successfully extracted \d+ characters/)
    await expect(successMessage).toBeVisible({ timeout: 60000 })

    const messageText = await successMessage.textContent()
    const charCount = messageText?.match(/(\d+) characters/)?.[1]

    console.log(`\n✅ TXT Upload Success!`)
    console.log(`   Characters extracted: ${charCount}`)

    expect(parseInt(charCount || '0')).toBeGreaterThan(100)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  })

  test('DOCX file upload and extraction', async ({ page }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📄 TEST 2: DOCX File Upload')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const docxFilePath = path.join(
      process.cwd(),
      'Sample documents',
      '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx'
    )
    console.log(`📁 File: ${path.basename(docxFilePath)}`)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(docxFilePath)

    console.log('⏳ Waiting for upload...')
    await expect(page.getByText('Uploading file...')).toBeVisible({ timeout: 5000 })

    console.log('⏳ Waiting for text extraction...')
    await expect(page.getByText('Extracting text from document...')).toBeVisible({ timeout: 10000 })

    console.log('⏳ Waiting for success message...')
    const successMessage = page.getByText(/Successfully extracted \d+ characters/)
    await expect(successMessage).toBeVisible({ timeout: 60000 })

    const messageText = await successMessage.textContent()
    const charCount = messageText?.match(/(\d+) characters/)?.[1]

    console.log(`\n✅ DOCX Upload Success!`)
    console.log(`   Characters extracted: ${charCount}`)

    // DOCX contract should have substantial content
    expect(parseInt(charCount || '0')).toBeGreaterThan(1000)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  })

  test('API endpoint functionality', async ({ page }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔌 TEST 3: API Endpoint Validation')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Set up request interception to verify API calls
    let apiCallMade = false
    let apiResponse: any = null

    page.on('response', async (response) => {
      if (response.url().includes('/api/extract-text')) {
        apiCallMade = true
        console.log(`📡 API Call detected: ${response.url()}`)
        console.log(`   Status: ${response.status()}`)

        if (response.status() === 200) {
          apiResponse = await response.json()
          console.log(`   Response: ${JSON.stringify(apiResponse)}`)
        }
      }
    })

    const txtFilePath = path.join(process.cwd(), 'Sample documents', 'test-contract-arlanda.txt')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(txtFilePath)

    await expect(page.getByText(/Successfully extracted \d+ characters/)).toBeVisible({ timeout: 60000 })

    console.log(`\n✅ API Endpoint Test Results:`)
    console.log(`   API Called: ${apiCallMade ? 'YES ✅' : 'NO ❌'}`)

    if (apiResponse) {
      console.log(`   Success: ${apiResponse.success ? 'YES ✅' : 'NO ❌'}`)
      console.log(`   Char Count: ${apiResponse.charCount}`)
      console.log(`   Excerpt: ${apiResponse.excerpt?.substring(0, 50)}...`)

      expect(apiResponse.success).toBe(true)
      expect(apiResponse.charCount).toBeGreaterThan(0)
      expect(apiResponse.excerpt).toBeDefined()
    }

    expect(apiCallMade).toBe(true)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  })
})
