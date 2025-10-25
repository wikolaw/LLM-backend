/**
 * API Integration Test: Batch Job Creation
 * Tests /api/batch/create endpoint
 * Note: Requires authentication and documents to be seeded in database
 */

import { test, expect } from '@playwright/test'
import { APIClient } from '../helpers/api-client'
import { login } from '../helpers/auth-helper'
import { SAMPLE_SCHEMAS, SYSTEM_PROMPT, TEST_MODELS } from '../helpers/test-data'

test.describe('API: /api/batch/create', () => {
  let apiClient: APIClient

  test.beforeEach(async ({ request }) => {
    // Login and set auth
    const session = await login(request)
    apiClient = new APIClient(request)
    apiClient.setAuth(session)

    console.log(`✅ Authenticated as user: ${session.userId}`)
  })

  test('should create batch job with valid parameters', async () => {
    console.log('🚀 Testing batch job creation...')

    // Note: This test requires document IDs to exist in database
    // In a real test, you would seed documents first or use known test doc IDs
    const mockDocumentIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    ]

    const batchJobId = await apiClient.createBatch({
      documentIds: mockDocumentIds,
      name: 'API Test Batch',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: 'Extract contract information',
      outputFormat: 'json',
      validationSchema: SAMPLE_SCHEMAS.simple,
      models: TEST_MODELS.fast_free
    })

    expect(batchJobId).toBeTruthy()
    expect(typeof batchJobId).toBe('string')
    expect(batchJobId.length).toBeGreaterThan(0)

    console.log(`✅ Batch job created with ID: ${batchJobId}`)
  })

  test('should reject batch creation without authentication', async () => {
    console.log('⚠️  Testing authentication requirement...')

    // Create client without auth
    const unauthClient = new APIClient(apiClient['request'])

    await expect(async () => {
      await unauthClient.createBatch({
        documentIds: ['doc1'],
        name: 'Test',
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: 'test',
        outputFormat: 'json',
        validationSchema: SAMPLE_SCHEMAS.simple,
        models: TEST_MODELS.fast_free
      })
    }).rejects.toThrow(/401|Unauthorized/)

    console.log('✅ Authentication requirement validated')
  })

  test('should reject batch with empty document array', async () => {
    console.log('⚠️  Testing empty document array validation...')

    await expect(async () => {
      await apiClient.createBatch({
        documentIds: [],
        name: 'Invalid Batch',
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: 'test',
        outputFormat: 'json',
        validationSchema: SAMPLE_SCHEMAS.simple,
        models: TEST_MODELS.fast_free
      })
    }).rejects.toThrow(/documentIds|required/)

    console.log('✅ Empty document validation successful')
  })

  test('should reject batch with invalid output format', async () => {
    console.log('⚠️  Testing output format validation...')

    await expect(async () => {
      await apiClient.createBatch({
        documentIds: ['doc1'],
        name: 'Invalid Format',
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: 'test',
        outputFormat: 'invalid' as any,
        validationSchema: SAMPLE_SCHEMAS.simple,
        models: TEST_MODELS.fast_free
      })
    }).rejects.toThrow(/outputFormat|json|jsonl/)

    console.log('✅ Format validation successful')
  })

  test('should reject batch with empty models array', async () => {
    console.log('⚠️  Testing model array validation...')

    await expect(async () => {
      await apiClient.createBatch({
        documentIds: ['doc1'],
        name: 'No Models',
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: 'test',
        outputFormat: 'json',
        validationSchema: SAMPLE_SCHEMAS.simple,
        models: []
      })
    }).rejects.toThrow(/models|required/)

    console.log('✅ Model array validation successful')
  })
})
