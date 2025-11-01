/**
 * Enhanced 3-Level Validator
 * Checks: 1) Valid JSON, 2) Correct Attributes, 3) Correct Formats
 * Version 3.0
 */

import { validateAgainstSchema, type OutputFormat, type ValidationError as AjvError } from './schema-validator.ts'
import { generatePromptGuidance } from './guidance-generator.ts'

export interface EnhancedValidationResult {
  // Overall validation status
  validationPassed: boolean

  // 3-level validation breakdown
  jsonValid: boolean
  attributesValid: boolean
  formatsValid: boolean

  // Detailed error categorization
  errors: {
    jsonErrors: string[]
    missingAttributes: string[]
    invalidAttributes: string[] // Unexpected attributes not in schema
    formatErrors: AjvError[]
  }

  // Parsed data (if JSON valid)
  parsedData?: any

  // Guidance for prompt improvement
  guidance: string[]
}

/**
 * Perform 3-level validation on LLM response
 *
 * @param rawResponse - Raw text response from LLM
 * @param schema - JSON Schema to validate against
 * @param format - Expected output format (json or jsonl)
 * @returns Enhanced validation result with 3-level breakdown
 */
export function validateResponse(
  rawResponse: string,
  schema: object,
  format: OutputFormat = 'json'
): EnhancedValidationResult {
  const result: EnhancedValidationResult = {
    validationPassed: false,
    jsonValid: false,
    attributesValid: false,
    formatsValid: false,
    errors: {
      jsonErrors: [],
      missingAttributes: [],
      invalidAttributes: [],
      formatErrors: []
    },
    guidance: []
  }

  // LEVEL 1: Check if response is valid JSON
  const jsonCheck = checkJSONValidity(rawResponse, format)
  result.jsonValid = jsonCheck.valid
  result.errors.jsonErrors = jsonCheck.errors
  result.parsedData = jsonCheck.parsedData

  if (!result.jsonValid) {
    // If JSON invalid, can't proceed to other checks
    result.validationPassed = false
    return result
  }

  // LEVEL 2: Check if JSON has correct attribute names
  const attrCheck = checkAttributes(result.parsedData!, schema, format)
  result.attributesValid = attrCheck.valid
  result.errors.missingAttributes = attrCheck.missingAttributes
  result.errors.invalidAttributes = attrCheck.invalidAttributes

  // LEVEL 3: Check if attribute values match expected formats
  const formatCheck = validateAgainstSchema(result.parsedData, schema, format)
  result.formatsValid = formatCheck.valid
  result.errors.formatErrors = formatCheck.errors

  // Overall validation passes if all 3 levels pass
  result.validationPassed = result.jsonValid && result.attributesValid && result.formatsValid

  // Generate prompt improvement guidance
  result.guidance = generatePromptGuidance(result, schema)

  return result
}

/**
 * Level 1: Check if response is valid JSON
 */
function checkJSONValidity(
  rawResponse: string,
  format: OutputFormat
): { valid: boolean; errors: string[]; parsedData?: any } {
  const errors: string[] = []

  // Clean up response (remove markdown code blocks if present)
  let cleanedResponse = rawResponse.trim()

  // Remove markdown JSON code blocks
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '')
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '')
  }

  try {
    if (format === 'jsonl') {
      // For JSON Lines, validate each line separately
      const lines = cleanedResponse.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        errors.push('Empty JSON Lines response')
        return { valid: false, errors }
      }

      const parsedLines = []
      for (let i = 0; i < lines.length; i++) {
        try {
          const parsed = JSON.parse(lines[i])
          parsedLines.push(parsed)
        } catch (e) {
          errors.push(`Line ${i + 1}: Invalid JSON - ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      if (errors.length > 0) {
        return { valid: false, errors }
      }

      return { valid: true, errors: [], parsedData: cleanedResponse }
    } else {
      // For regular JSON, parse once
      const parsed = JSON.parse(cleanedResponse)
      return { valid: true, errors: [], parsedData: parsed }
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    errors.push(`Invalid JSON syntax: ${errorMsg}`)

    // Check for common JSON errors
    if (errorMsg.includes('Unexpected token')) {
      errors.push('Tip: Response may contain non-JSON text before or after JSON object')
    }
    if (cleanedResponse.includes('```')) {
      errors.push('Tip: Response contains markdown code blocks')
    }

    return { valid: false, errors }
  }
}

/**
 * Level 2: Check if JSON has correct attribute names
 */
function checkAttributes(
  data: any,
  schema: any,
  format: OutputFormat
): { valid: boolean; missingAttributes: string[]; invalidAttributes: string[] } {
  const missingAttributes: string[] = []
  const invalidAttributes: string[] = []

  if (format === 'jsonl') {
    // For JSON Lines, check first line as sample
    const lines = data.split('\n').filter((l: string) => l.trim())
    if (lines.length === 0) {
      return { valid: true, missingAttributes: [], invalidAttributes: [] }
    }

    try {
      const firstObj = JSON.parse(lines[0])
      return checkAttributesForObject(firstObj, schema)
    } catch (e) {
      return { valid: false, missingAttributes: ['Unable to parse first line'], invalidAttributes: [] }
    }
  } else {
    return checkAttributesForObject(data, schema)
  }
}

/**
 * Check attributes for a single object against schema
 */
function checkAttributesForObject(
  obj: any,
  schema: any
): { valid: boolean; missingAttributes: string[]; invalidAttributes: string[] } {
  const missingAttributes: string[] = []
  const invalidAttributes: string[] = []

  if (!obj || typeof obj !== 'object') {
    return { valid: false, missingAttributes: ['Response is not an object'], invalidAttributes: [] }
  }

  // Get required properties from schema
  const schemaProperties = schema.properties || {}
  const requiredProperties = schema.required || []
  const actualProperties = Object.keys(obj)

  // Check for missing required attributes
  for (const required of requiredProperties) {
    if (!(required in obj)) {
      missingAttributes.push(required)
    }
  }

  // Check for invalid/unexpected attributes (not in schema)
  for (const actual of actualProperties) {
    if (!(actual in schemaProperties)) {
      invalidAttributes.push(actual)
    }
  }

  const valid = missingAttributes.length === 0 && invalidAttributes.length === 0

  return { valid, missingAttributes, invalidAttributes }
}

/**
 * Get all validation errors as a flat array for storage
 */
export function getValidationDetails(result: EnhancedValidationResult): any {
  return {
    jsonErrors: result.errors.jsonErrors,
    missingAttributes: result.errors.missingAttributes,
    invalidAttributes: result.errors.invalidAttributes,
    formatErrors: result.errors.formatErrors.map(err => ({
      message: err.message,
      path: err.path,
      keyword: err.keyword
    }))
  }
}
