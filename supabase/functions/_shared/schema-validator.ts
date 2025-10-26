/**
 * JSON Schema Validator (Deno version for Edge Functions)
 * Validates LLM outputs against JSON Schema using Ajv
 * Version 2.0
 */

import Ajv from 'npm:ajv@8'
import addFormats from 'npm:ajv-formats@3'

export type OutputFormat = 'json' | 'jsonl'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  line?: number // For JSON Lines format
  message: string
  path?: string
  keyword?: string
}

/**
 * Transform schema to make all types accept null globally
 * Recursively adds "null" to all type definitions
 *
 * @param schema - Original JSON Schema
 * @returns Transformed schema where all fields accept null
 */
function makeSchemaAcceptNull(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const transformed = { ...schema }

  // If this has a "type" property, make it nullable
  if (transformed.type) {
    if (Array.isArray(transformed.type)) {
      // Already array - add "null" if not present
      if (!transformed.type.includes('null')) {
        transformed.type = [...transformed.type, 'null']
      }
    } else if (transformed.type !== 'null') {
      // Single type - convert to array with null
      transformed.type = [transformed.type, 'null']
    }
  }

  // Recursively transform nested properties
  if (transformed.properties) {
    transformed.properties = Object.fromEntries(
      Object.entries(transformed.properties).map(([key, value]) => [
        key,
        makeSchemaAcceptNull(value)
      ])
    )
  }

  // Recursively transform array items
  if (transformed.items) {
    transformed.items = makeSchemaAcceptNull(transformed.items)
  }

  // Recursively transform oneOf, anyOf, allOf
  for (const keyword of ['oneOf', 'anyOf', 'allOf']) {
    if (transformed[keyword]) {
      transformed[keyword] = transformed[keyword].map(makeSchemaAcceptNull)
    }
  }

  return transformed
}

/**
 * Validate data against JSON Schema
 *
 * @param data - Parsed JSON data (object for json, string for jsonl)
 * @param schema - JSON Schema object
 * @param format - Output format (json or jsonl)
 * @returns Validation result with errors if invalid
 */
export function validateAgainstSchema(
  data: any,
  schema: object,
  format: OutputFormat
): ValidationResult {
  // Transform schema to accept null globally for all fields
  const nullableSchema = makeSchemaAcceptNull(schema)

  const ajv = new Ajv({
    allErrors: true, // Collect all errors, not just first
    verbose: true, // Include more error details
    strict: false // Don't fail on unknown keywords
  })
  addFormats(ajv) // Add support for format: "date", "email", etc.

  const validate = ajv.compile(nullableSchema)

  if (format === 'jsonl') {
    return validateJSONLines(data, validate)
  } else {
    return validateJSON(data, validate)
  }
}

/**
 * Validate single JSON object
 */
function validateJSON(data: any, validate: any): ValidationResult {
  const valid = validate(data)

  if (valid) {
    return { valid: true, errors: [] }
  }

  const errors: ValidationError[] = (validate.errors || []).map((err: any) => ({
    message: err.message || 'Validation error',
    path: err.instancePath || err.dataPath,
    keyword: err.keyword
  }))

  return { valid: false, errors }
}

/**
 * Validate JSON Lines (one JSON object per line)
 */
function validateJSONLines(rawText: string, validate: any): ValidationResult {
  const lines = rawText.split('\n').filter(line => line.trim())
  const allErrors: ValidationError[] = []
  let allValid = true

  lines.forEach((line, index) => {
    try {
      const obj = JSON.parse(line)
      const valid = validate(obj)

      if (!valid) {
        allValid = false
        const lineErrors = (validate.errors || []).map((err: any) => ({
          line: index + 1,
          message: err.message || 'Validation error',
          path: err.instancePath || err.dataPath,
          keyword: err.keyword
        }))
        allErrors.push(...lineErrors)
      }
    } catch (e) {
      allValid = false
      allErrors.push({
        line: index + 1,
        message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
      })
    }
  })

  return { valid: allValid, errors: allErrors }
}

/**
 * Check if a schema is valid JSON Schema
 *
 * @param schema - Schema object to validate
 * @returns true if valid JSON Schema
 */
export function isValidJSONSchema(schema: any): boolean {
  if (!schema || typeof schema !== 'object') {
    return false
  }

  try {
    const ajv = new Ajv({ strict: false })
    ajv.compile(schema)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Get detailed error message from schema validation
 *
 * @param errors - Validation errors
 * @returns Human-readable error description
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No errors'
  }

  return errors
    .map(err => {
      const parts: string[] = []
      if (err.line) parts.push(`Line ${err.line}`)
      if (err.path) parts.push(`Path: ${err.path}`)
      parts.push(err.message)
      return parts.join(' - ')
    })
    .join('\n')
}
