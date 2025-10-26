/**
 * API Integration Test: JSON Schema Generation
 * Tests /api/generate-schema endpoint with real OpenRouter API calls
 */

import { test, expect } from '@playwright/test'
import { APIClient } from '../helpers/api-client'
import { SAMPLE_PROMPTS } from '../helpers/test-data'
import { assertValidJSONSchema } from '../helpers/assertions'

test.describe('API: /api/generate-schema', () => {
  let apiClient: APIClient

  test.beforeEach(async ({ request }) => {
    apiClient = new APIClient(request)
  })

  test('should generate valid JSON Schema from contract prompt', async () => {
    console.log('🤖 Testing JSON Schema generation for contract extraction...')

    // First optimize the prompt
    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.swedish_contract,
      'json'
    )
    console.log('✅ Prompt optimized')

    // Generate schema
    const schema = await apiClient.generateSchema(
      SAMPLE_PROMPTS.swedish_contract,
      optimized,
      'json'
    )
    console.log('✅ Schema generated')

    // Validate schema structure
    assertValidJSONSchema(schema)

    // Check for expected fields from Swedish contract prompt
    expect(schema).toHaveProperty('properties')
    const props = (schema as any).properties

    // Should have some of these fields based on the prompt
    const expectedFields = ['contract_name', 'parties', 'dates', 'financial', 'infrastructure']
    const hasExpectedFields = expectedFields.some(field => props[field])
    expect(hasExpectedFields).toBe(true)

    console.log('✅ Schema validation successful')
    console.log(`📋 Schema has ${Object.keys(props).length} properties`)
  })

  test('should generate schema with required fields array', async () => {
    console.log('🤖 Testing schema required fields...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.simple_extraction,
      'json'
    )

    const schema = await apiClient.generateSchema(
      SAMPLE_PROMPTS.simple_extraction,
      optimized,
      'json'
    )

    // Check for required array
    expect(schema).toHaveProperty('required')
    expect(Array.isArray((schema as any).required)).toBe(true)

    console.log('✅ Required fields array present')
  })

  test('should handle JSON Lines format', async () => {
    console.log('🤖 Testing schema generation for JSON Lines format...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.simple_extraction,
      'jsonl'
    )

    const schema = await apiClient.generateSchema(
      SAMPLE_PROMPTS.simple_extraction,
      optimized,
      'jsonl'
    )

    // Schema should still be for individual objects (JSON Lines validates per line)
    assertValidJSONSchema(schema)

    console.log('✅ JSON Lines schema generated successfully')
  })

  test('should generate schemas with nested objects', async () => {
    console.log('🤖 Testing nested object schema generation...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.swedish_contract,
      'json'
    )

    const schema = await apiClient.generateSchema(
      SAMPLE_PROMPTS.swedish_contract,
      optimized,
      'json'
    )

    const props = (schema as any).properties

    // Look for nested objects (parties, dates, financial, etc.)
    const hasNestedObject = Object.values(props).some(
      (prop: any) => prop.type === 'object' && prop.properties
    )

    expect(hasNestedObject).toBe(true)
    console.log('✅ Schema includes nested objects')
  })

  test('should handle errors gracefully', async () => {
    console.log('⚠️  Testing error handling...')

    await expect(async () => {
      await apiClient.generateSchema('', '', 'json')
    }).rejects.toThrow()

    console.log('✅ Error handling validated')
  })

  test('should generate nullable fields for optional properties', async () => {
    console.log('🤖 Testing nullable field generation for optional properties...')

    const optimized = await apiClient.optimizePrompt(
      SAMPLE_PROMPTS.swedish_contract,
      'json'
    )

    const schema = await apiClient.generateSchema(
      SAMPLE_PROMPTS.swedish_contract,
      optimized,
      'json'
    )

    const props = (schema as any).properties
    const required = (schema as any).required || []

    console.log(`📋 Schema has ${Object.keys(props).length} properties`)
    console.log(`📌 ${required.length} required fields: ${required.join(', ')}`)

    // Check that at least some optional fields are nullable
    let nullableFieldsCount = 0
    let nonNullableOptionalCount = 0

    for (const [fieldName, fieldSchema] of Object.entries(props)) {
      const isRequired = required.includes(fieldName)
      const fieldType = (fieldSchema as any).type

      if (!isRequired && fieldType) {
        if (Array.isArray(fieldType) && fieldType.includes('null')) {
          nullableFieldsCount++
          console.log(`  ✅ Optional field "${fieldName}" is nullable: ${JSON.stringify(fieldType)}`)
        } else if (fieldType === 'object') {
          // Objects themselves might not be null, but check nested fields
          const nestedProps = (fieldSchema as any).properties
          if (nestedProps) {
            for (const [nestedName, nestedSchema] of Object.entries(nestedProps)) {
              const nestedType = (nestedSchema as any).type
              if (Array.isArray(nestedType) && nestedType.includes('null')) {
                nullableFieldsCount++
                console.log(`  ✅ Nested optional field "${fieldName}.${nestedName}" is nullable`)
              }
            }
          }
        } else {
          nonNullableOptionalCount++
          console.log(`  ⚠️  Optional field "${fieldName}" is NOT nullable: ${JSON.stringify(fieldType)}`)
        }
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`  - Nullable optional fields: ${nullableFieldsCount}`)
    console.log(`  - Non-nullable optional fields: ${nonNullableOptionalCount}`)

    // At least some optional fields should be nullable
    expect(nullableFieldsCount).toBeGreaterThan(0)

    console.log('✅ Schema correctly generates nullable fields for optional properties')
  })
})
