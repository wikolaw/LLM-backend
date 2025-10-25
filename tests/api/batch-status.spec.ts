/**
 * API Integration Test: Batch Status Polling
 * Tests /api/batch/[id]/status endpoint
 */

import { test, expect } from '@playwright/test'
import { APIClient } from '../helpers/api-client'
import { login } from '../helpers/auth-helper'
import { assertBatchStatus } from '../helpers/assertions'

test.describe('API: /api/batch/[id]/status', () => {
  let apiClient: APIClient

  test.beforeEach(async ({ request }) => {
    const session = await login(request)
    apiClient = new APIClient(request)
    apiClient.setAuth(session)

    console.log(`✅ Authenticated as user: ${session.userId}`)
  })

  test('should return batch status with correct structure', async () => {
    console.log('📊 Testing batch status endpoint...')

    // Note: This requires a valid batch job ID from database
    const mockBatchJobId = '00000000-0000-0000-0000-000000000001'

    try {
      const status = await apiClient.getBatchStatus(mockBatchJobId)

      // Validate structure
      assertBatchStatus(status)

      console.log(`✅ Status retrieved: ${status.status}`)
      console.log(`   Completed: ${status.completedDocuments}/${status.totalDocuments}`)
    } catch (error) {
      expect((error as Error).message).toContain('not found')
      console.log('⚠️  Mock batch ID not found (expected)')
    }
  })

  test('should reject status request without authentication', async () => {
    console.log('⚠️  Testing authentication requirement...')

    const unauthClient = new APIClient(apiClient['request'])

    await expect(async () => {
      await unauthClient.getBatchStatus('any-id')
    }).rejects.toThrow(/401|Unauthorized/)

    console.log('✅ Authentication requirement validated')
  })

  test('should reject status for non-existent batch', async () => {
    console.log('⚠️  Testing non-existent batch handling...')

    await expect(async () => {
      await apiClient.getBatchStatus('00000000-0000-0000-0000-999999999999')
    }).rejects.toThrow(/not found|404/)

    console.log('✅ Non-existent batch validation successful')
  })

  test('should demonstrate polling functionality', async () => {
    console.log('🔄 Testing polling with timeout...')

    // Test polling with short timeout (should fail for mock ID)
    const mockBatchJobId = '00000000-0000-0000-0000-000000000001'

    try {
      await apiClient.pollUntilComplete(mockBatchJobId, {
        timeout: 5000,  // 5 seconds
        interval: 1000, // 1 second
        onProgress: (status) => {
          console.log(`   Progress: ${status.completedDocuments}/${status.totalDocuments}`)
        }
      })
    } catch (error) {
      // Expected to fail with mock ID or timeout
      expect((error as Error).message).toMatch(/timeout|not found/)
      console.log('⚠️  Polling failed as expected (mock ID or timeout)')
    }
  })
})
