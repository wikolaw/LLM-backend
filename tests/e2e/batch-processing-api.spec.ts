/**
 * E2E Test: Batch Processing via API (No UI)
 * Complete workflow test using only API calls with real OpenRouter integration
 *
 * This test demonstrates the same functionality as the UI test but without browser automation:
 * 1. Upload documents (via DB seeding - API upload not yet implemented)
 * 2. Optimize prompt with AI
 * 3. Generate JSON schema
 * 4. Create batch job
 * 5. Start batch processing (async Edge Function)
 * 6. Poll status until complete
 * 7. Fetch and validate analytics
 */

import { test, expect } from '@playwright/test'
import { APIClient } from '../helpers/api-client'
import { login } from '../helpers/auth-helper'
import {
  readSamplePrompt,
  SYSTEM_PROMPT,
  TEST_MODELS,
  SAMPLE_DOCUMENTS
} from '../helpers/test-data'
import {
  assertOptimizedPrompt,
  assertValidJSONSchema,
  assertBatchCompleted,
  assertBatchAnalytics,
  printBatchSummary
} from '../helpers/assertions'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

test.describe('E2E: Batch Processing via API (No UI)', () => {
  test.setTimeout(600000) // 10 minutes for full batch processing with real API

  test('should complete full batch workflow: upload → optimize → generate → process → analyze', async ({ request }) => {
    console.log('\n🚀 Starting E2E Batch Processing Test (No UI)\n')

    // ============================================================================
    // Step 1: Authentication
    // ============================================================================
    console.log('1️⃣  Authenticating...')
    const session = await login(request)
    const apiClient = new APIClient(request)
    apiClient.setAuth(session)
    console.log(`   ✅ Logged in as: ${session.userId}\n`)

    // ============================================================================
    // Step 2: Seed Documents (Direct DB Access)
    // ============================================================================
    console.log('2️⃣  Seeding test documents...')

    // Initialize Supabase client for direct DB access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Read sample documents
    const documentPaths = SAMPLE_DOCUMENTS.slice(0, 3)
    const documentIds: string[] = []
    const storagePaths: string[] = [] // Track uploaded files for cleanup

    for (const filename of documentPaths) {
      const filePath = path.join(process.cwd(), 'Sample documents', filename)
      const fileBuffer = fs.readFileSync(filePath)

      // Step 1: Upload to Supabase Storage (REAL - same as production UI)
      const fileExt = filename.split('.').pop()
      const storagePath = `test/${session.userId}/${Date.now()}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error(`   ⚠️  Failed to upload ${filename}:`, uploadError)
        throw uploadError
      }

      console.log(`   ✅ Uploaded to storage: ${filename}`)
      storagePaths.push(storagePath)

      // Step 2: Create document record (REAL - same as production)
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: session.userId,
          filename: filename,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          storage_path: storagePath
        })
        .select()
        .single()

      if (dbError) {
        console.error(`   ⚠️  Failed to create document ${filename}:`, dbError)
        throw dbError
      }

      console.log(`   ✅ Created DB record: ${doc.id}`)

      // Step 3: Extract text via API (REAL - uses mammoth, same as production)
      const extractResponse = await request.post('http://localhost:3000/api/extract-text', {
        data: {
          documentId: doc.id,
          storagePath: storagePath,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      })

      if (!extractResponse.ok()) {
        const error = await extractResponse.text()
        console.error(`   ⚠️  Failed to extract text from ${filename}:`, error)
        throw new Error(`Extraction failed: ${error}`)
      }

      const extractResult = await extractResponse.json()

      if (!extractResult.success) {
        throw new Error(extractResult.error || 'Text extraction failed')
      }

      console.log(`   ✅ Extracted: ${extractResult.charCount} chars from ${filename}`)

      documentIds.push(doc.id)
    }

    console.log(`   ✅ ${documentIds.length} documents seeded\n`)

    // ============================================================================
    // Step 3: Read Sample User Prompt
    // ============================================================================
    console.log('3️⃣  Loading sample user prompt...')
    const userPrompt = readSamplePrompt()
    console.log(`   ✅ Loaded prompt (${userPrompt.split(/\s+/).length} words)\n`)

    // ============================================================================
    // Step 4: Optimize Prompt with AI
    // ============================================================================
    console.log('4️⃣  Optimizing prompt with AI (GPT-4o-mini)...')
    const startOptimize = Date.now()

    const optimizedPrompt = await apiClient.optimizePrompt(userPrompt, 'json')

    const optimizeTime = Date.now() - startOptimize
    const wordCount = optimizedPrompt.split(/\s+/).length

    console.log(`   ✅ Optimized in ${optimizeTime}ms`)
    console.log(`   📝 Word count: ${wordCount} (target: 400-800)`)

    // Validate optimization
    assertOptimizedPrompt(optimizedPrompt)
    console.log(`   ✅ Optimization quality validated\n`)

    // ============================================================================
    // Step 5: Generate JSON Schema
    // ============================================================================
    console.log('5️⃣  Generating JSON schema (GPT-4o-mini)...')
    const startSchema = Date.now()

    const schema = await apiClient.generateSchema(userPrompt, optimizedPrompt, 'json')

    const schemaTime = Date.now() - startSchema
    const fieldCount = Object.keys((schema as any).properties || {}).length

    console.log(`   ✅ Schema generated in ${schemaTime}ms`)
    console.log(`   📋 Fields: ${fieldCount}`)

    // Validate schema
    assertValidJSONSchema(schema)
    console.log(`   ✅ Schema structure validated\n`)

    // ============================================================================
    // Step 6: Create Batch Job
    // ============================================================================
    console.log('6️⃣  Creating batch job...')
    const batchName = `API E2E Test - ${new Date().toISOString()}`
    const models = TEST_MODELS.fast_free // Use fast free models for testing

    const batchJobId = await apiClient.createBatch({
      documentIds,
      name: batchName,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: optimizedPrompt,
      outputFormat: 'json',
      validationSchema: schema,
      models
    })

    console.log(`   ✅ Batch created: ${batchJobId}`)
    console.log(`   📊 Configuration:`)
    console.log(`      - Documents: ${documentIds.length}`)
    console.log(`      - Models: ${models.length}`)
    console.log(`      - Total runs: ${documentIds.length * models.length}\n`)

    // ============================================================================
    // Step 7: Start Batch Processing
    // ============================================================================
    console.log('7️⃣  Starting batch processing (async Edge Function)...')
    await apiClient.startBatch(batchJobId)
    console.log(`   ✅ Batch processing started\n`)

    // ============================================================================
    // Step 8: Poll Status Until Complete
    // ============================================================================
    console.log('8️⃣  Polling status (every 2 seconds)...')
    let pollCount = 0

    const finalStatus = await apiClient.pollUntilComplete(batchJobId, {
      timeout: 600000,  // 10 minutes max
      interval: 2000,   // Poll every 2 seconds
      onProgress: (status) => {
        pollCount++
        if (pollCount % 10 === 0) { // Log every 20 seconds
          console.log(`   ⏳ Still processing... ${status.completedDocuments}/${status.totalDocuments} docs complete`)
          console.log(`      ${status.successfulRuns} passed, ${status.failedRuns} failed`)
        }
      }
    })

    const totalTime = pollCount * 2
    console.log(`\n   ✅ Batch completed in ~${totalTime} seconds`)
    console.log(`   📊 Final counts:`)
    console.log(`      - Successful runs: ${finalStatus.successfulRuns}`)
    console.log(`      - Failed runs: ${finalStatus.failedRuns}\n`)

    // Validate completion
    assertBatchCompleted(finalStatus, documentIds.length)

    // ============================================================================
    // Step 9: Fetch and Validate Analytics
    // ============================================================================
    console.log('9️⃣  Fetching batch analytics...')
    const analytics = await apiClient.getBatchAnalytics(batchJobId)

    console.log(`   ✅ Analytics retrieved\n`)

    // Validate analytics structure
    assertBatchAnalytics(analytics, documentIds.length, models.length)

    // Print detailed summary
    printBatchSummary(analytics)

    // ============================================================================
    // Step 10: Validate Results
    // ============================================================================
    console.log('🔍 Validating results...')

    // Check global metrics
    expect(analytics.globalSummary.totalDocuments).toBe(documentIds.length)
    expect(analytics.globalSummary.totalRuns).toBe(documentIds.length * models.length)
    expect(analytics.globalSummary.successRate).toBeGreaterThanOrEqual(0)
    expect(analytics.globalSummary.successRate).toBeLessThanOrEqual(1)

    // Check that we have data for each model
    expect(analytics.modelAnalytics).toHaveLength(models.length)

    // Check that we have results for each document
    expect(analytics.documentResults).toHaveLength(documentIds.length)

    console.log(`   ✅ All validations passed\n`)

    // ============================================================================
    // Cleanup: Delete Test Documents
    // ============================================================================
    console.log('🧹 Cleaning up test data...')

    // Delete storage files (IMPORTANT: clean up uploaded files)
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(storagePaths)

      if (storageError) {
        console.warn('   ⚠️  Storage cleanup warning:', storageError)
      } else {
        console.log(`   ✅ ${storagePaths.length} storage files deleted`)
      }
    }

    // Delete DB records
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .in('id', documentIds)

    if (dbError) {
      console.warn('   ⚠️  DB cleanup warning:', dbError)
    } else {
      console.log(`   ✅ ${documentIds.length} DB records deleted\n`)
    }

    // ============================================================================
    // Summary
    // ============================================================================
    console.log('✅✅✅ E2E TEST COMPLETED SUCCESSFULLY! ✅✅✅\n')
    console.log('📊 Summary:')
    console.log(`   - Test type: API-only (no UI/browser)`)
    console.log(`   - Documents processed: ${documentIds.length}`)
    console.log(`   - Models tested: ${models.length}`)
    console.log(`   - Total runs: ${analytics.globalSummary.totalRuns}`)
    console.log(`   - Success rate: ${(analytics.globalSummary.successRate * 100).toFixed(1)}%`)
    console.log(`   - Total cost: $${analytics.globalSummary.totalCost.toFixed(4)}`)
    console.log(`   - Avg execution time: ${analytics.globalSummary.avgExecutionTime}ms`)
    console.log(`   - Total test time: ~${totalTime} seconds`)
    console.log('')
  })
})
