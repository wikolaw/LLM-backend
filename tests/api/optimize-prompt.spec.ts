/**
 * API Integration Test: Prompt Optimization
 * Tests /api/optimize-prompt endpoint with real OpenRouter API calls
 */

import { test, expect } from '@playwright/test'
import { APIClient } from '../helpers/api-client'
import { SAMPLE_PROMPTS, SYSTEM_PROMPT } from '../helpers/test-data'
import { assertOptimizedPrompt } from '../helpers/assertions'

test.describe('API: /api/optimize-prompt', () => {
  let apiClient: APIClient

  test.beforeEach(async ({ request }) => {
    apiClient = new APIClient(request)
  })

  test('should optimize Swedish contract prompt to 400-800 words', async () => {
    console.log('🤖 Testing prompt optimization with Swedish contract extraction...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.swedish_contract,
      'json'
    )

    console.log(`✅ Received optimized prompt (${optimized.split(/\s+/).length} words)`)

    // Assert optimization quality
    assertOptimizedPrompt(optimized)

    // Additional checks
    expect(optimized).toContain('DOCUMENT CONTEXT')
    expect(optimized).toContain('REQUIRED FIELDS')
    expect(optimized).toContain('FORMAT STANDARDS')
    expect(optimized).toContain('EXTRACTION RULES')
    expect(optimized).toContain('OUTPUT FORMAT')

    // Should preserve original language context
    expect(optimized.toLowerCase()).toContain('swedish')

    console.log('✅ Prompt optimization passed all validations')
  })

  test('should optimize English invoice prompt', async () => {
    console.log('🤖 Testing prompt optimization with English invoice extraction...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.english_invoice,
      'json'
    )

    const wordCount = optimized.split(/\s+/).length
    console.log(`✅ Received optimized prompt (${wordCount} words)`)

    // Check length
    expect(wordCount).toBeGreaterThanOrEqual(400)
    expect(wordCount).toBeLessThanOrEqual(800)

    // Check for required sections
    expect(optimized).toContain('REQUIRED FIELDS')
    expect(optimized).toContain('invoice')

    console.log('✅ English invoice prompt optimization successful')
  })

  test('should handle simple extraction prompt', async () => {
    console.log('🤖 Testing prompt optimization with simple extraction...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.simple_extraction,
      'json'
    )

    const wordCount = optimized.split(/\s+/).length
    console.log(`✅ Received optimized prompt (${wordCount} words)`)

    // Even simple prompts should be expanded to 400-800 words
    expect(wordCount).toBeGreaterThanOrEqual(400)

    // Should have field specifications
    expect(optimized).toContain('name')
    expect(optimized).toContain('date')
    expect(optimized).toContain('amount')

    console.log('✅ Simple prompt optimization successful')
  })

  test('should support JSON Lines format', async () => {
    console.log('🤖 Testing prompt optimization with JSON Lines format...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.simple_extraction,
      'jsonl'
    )

    // Should mention JSON Lines format
    expect(optimized).toContain('JSON Lines')

    console.log('✅ JSON Lines format handling successful')
  })

  test('should handle errors gracefully', async () => {
    console.log('⚠️  Testing error handling...')

    // Test with empty prompt
    await expect(async () => {
      await apiClient.optimizePrompt('', 'json')
    }).rejects.toThrow()

    console.log('✅ Error handling validated')
  })
})
