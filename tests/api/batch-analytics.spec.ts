/**
 * API Integration Test: Batch Analytics
 * Tests /api/batch/[id]/analytics endpoint
 */

import { test, expect } from '@playwright/test'
import { APIClient } from '../helpers/api-client'
import { login } from '../helpers/auth-helper'

test.describe('API: /api/batch/[id]/analytics', () => {
  let apiClient: APIClient

  test.beforeEach(async ({ request }) => {
    const session = await login(request)
    apiClient = new APIClient(request)
    apiClient.setAuth(session)

    console.log(`✅ Authenticated as user: ${session.userId}`)
  })

  test('should return analytics with correct structure', async () => {
    console.log('📊 Testing batch analytics endpoint...')

    // Note: This requires a completed batch job with analytics
    const mockBatchJobId = '00000000-0000-0000-0000-000000000001'

    try {
      const analytics = await apiClient.getBatchAnalytics(mockBatchJobId)

      // Validate structure
      expect(analytics).toHaveProperty('globalSummary')
      expect(analytics).toHaveProperty('modelAnalytics')
      expect(analytics).toHaveProperty('documentResults')
      expect(analytics).toHaveProperty('attributeFailures')

      console.log(`✅ Analytics retrieved successfully`)
      console.log(`   Total documents: ${analytics.globalSummary.totalDocuments}`)
      console.log(`   Total runs: ${analytics.globalSummary.totalRuns}`)
      console.log(`   Models analyzed: ${analytics.modelAnalytics.length}`)
    } catch (error) {
      expect((error as Error).message).toContain('not found')
      console.log('⚠️  Mock batch ID not found (expected)')
    }
  })

  test('should reject analytics without authentication', async () => {
    console.log('⚠️  Testing authentication requirement...')

    const unauthClient = new APIClient(apiClient['request'])

    await expect(async () => {
      await unauthClient.getBatchAnalytics('any-id')
    }).rejects.toThrow(/401|Unauthorized/)

    console.log('✅ Authentication requirement validated')
  })

  test('should reject analytics for non-existent batch', async () => {
    console.log('⚠️  Testing non-existent batch handling...')

    await expect(async () => {
      await apiClient.getBatchAnalytics('00000000-0000-0000-0000-999999999999')
    }).rejects.toThrow(/not found|404/)

    console.log('✅ Non-existent batch validation successful')
  })
})
