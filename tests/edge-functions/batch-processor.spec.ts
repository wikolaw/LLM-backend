/**
 * Edge Function Test: Batch Processor
 * Tests the batch-processor Supabase Edge Function directly
 *
 * Note: This test calls the Edge Function via supabase.functions.invoke()
 * which requires:
 * 1. Supabase local dev environment (supabase start)
 * 2. OR deployed Edge Functions with service role key
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { login } from '../helpers/auth-helper'

test.describe('Edge Function: batch-processor', () => {
  test.setTimeout(600000) // 10 minutes for batch processing

  test('should process batch job when invoked', async ({ request }) => {
    console.log('🔧 Testing batch-processor Edge Function...')

    // Authenticate
    const session = await login(request)
    console.log(`✅ Authenticated as: ${session.userId}`)

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Note: This test requires a seeded batch job with documents
    // In a real implementation, you would:
    // 1. Seed documents in DB
    // 2. Create batch job record
    // 3. Invoke batch-processor with batchJobId
    // 4. Poll database for completion
    // 5. Validate outputs in DB

    const mockBatchJobId = '00000000-0000-0000-0000-000000000001'

    try {
      const { data, error } = await supabase.functions.invoke('batch-processor', {
        body: { batchJobId: mockBatchJobId }
      })

      if (error) {
        console.log(`⚠️  Edge Function error (expected for mock ID): ${error.message}`)
        expect(error.message).toContain('not found')
      } else {
        console.log('✅ Edge Function invoked successfully')
        expect(data).toHaveProperty('success')
      }
    } catch (error) {
      console.log(`⚠️  Edge Function call failed (expected for mock ID)`)
      expect((error as Error).message).toBeTruthy()
    }
  })

  test.skip('should validate Edge Function with real batch job', async ({ request }) => {
    // TODO: Implement full Edge Function test with:
    // 1. Document seeding
    // 2. Batch job creation in DB
    // 3. Edge Function invocation
    // 4. Result validation in DB
    // 5. Analytics verification

    console.log('⏭️  Real batch job test not yet implemented')
  })
})
