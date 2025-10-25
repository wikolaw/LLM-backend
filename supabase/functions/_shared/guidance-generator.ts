/**
 * Prompt Guidance Generator
 * Analyzes validation failures and generates specific improvement suggestions
 * Version 3.0
 */

import type { EnhancedValidationResult } from './enhanced-validator.ts'

/**
 * Generate prompt improvement guidance based on validation failures
 *
 * @param result - Enhanced validation result
 * @param schema - JSON Schema used for validation
 * @returns Array of specific guidance strings
 */
export function generatePromptGuidance(
  result: EnhancedValidationResult,
  schema: any
): string[] {
  const guidance: string[] = []

  // Level 1: JSON Validity Issues
  if (!result.jsonValid) {
    guidance.push(...generateJSONGuidance(result.errors.jsonErrors))
  }

  // Level 2: Attribute Issues
  if (!result.attributesValid) {
    guidance.push(...generateAttributeGuidance(
      result.errors.missingAttributes,
      result.errors.invalidAttributes,
      schema
    ))
  }

  // Level 3: Format Issues
  if (!result.formatsValid) {
    guidance.push(...generateFormatGuidance(result.errors.formatErrors, schema))
  }

  // If all validation passed, provide optimization tips
  if (result.validationPassed) {
    guidance.push('✅ Validation passed! Consider testing with additional documents to ensure consistency.')
  }

  return guidance
}

/**
 * Generate guidance for JSON parsing failures
 */
function generateJSONGuidance(jsonErrors: string[]): string[] {
  const guidance: string[] = []

  if (jsonErrors.length === 0) return guidance

  // Check for common JSON issues
  const hasMarkdownBlock = jsonErrors.some(e => e.includes('markdown'))
  const hasSyntaxError = jsonErrors.some(e => e.includes('syntax') || e.includes('Unexpected token'))
  const hasExtraText = jsonErrors.some(e => e.includes('non-JSON text'))

  if (hasMarkdownBlock) {
    guidance.push('❌ JSON Error: Add to prompt: "Return ONLY valid JSON. Do not wrap in markdown code blocks (```json)."')
  }

  if (hasSyntaxError) {
    guidance.push('❌ JSON Error: Add to prompt: "Ensure valid JSON syntax: use double quotes for strings, no trailing commas, proper brackets."')
  }

  if (hasExtraText) {
    guidance.push('❌ JSON Error: Add to prompt: "Output ONLY the JSON object. No explanatory text before or after."')
  }

  // Generic JSON guidance if specific issues not detected
  if (guidance.length === 0) {
    guidance.push('❌ JSON Error: Emphasize JSON format: "Your response must be valid, parseable JSON. Test your output with a JSON validator."')
  }

  return guidance
}

/**
 * Generate guidance for attribute name issues
 */
function generateAttributeGuidance(
  missingAttributes: string[],
  invalidAttributes: string[],
  schema: any
): string[] {
  const guidance: string[] = []

  // Missing required attributes
  if (missingAttributes.length > 0) {
    const attrList = missingAttributes.map(a => `"${a}"`).join(', ')

    guidance.push(
      `⚠️ Missing Fields: Add to prompt: "REQUIRED fields that MUST be included: ${attrList}. Use null if data is not available."`
    )

    // Provide example structure
    const exampleFields = missingAttributes.slice(0, 3)
    const exampleJson = exampleFields.map(field => {
      const propSchema = schema.properties?.[field]
      const exampleValue = getExampleValue(propSchema)
      return `  "${field}": ${exampleValue}`
    }).join(',\n')

    guidance.push(
      `💡 Add example structure:\n{\n${exampleJson}\n  ...\n}`
    )
  }

  // Invalid/unexpected attributes
  if (invalidAttributes.length > 0) {
    const attrList = invalidAttributes.map(a => `"${a}"`).join(', ')
    const expectedAttrs = Object.keys(schema.properties || {}).map(a => `"${a}"`).join(', ')

    guidance.push(
      `⚠️ Unexpected Fields: Model returned: ${attrList}. Add to prompt: "Use ONLY these field names: ${expectedAttrs}. Do not add extra fields."`
    )
  }

  return guidance
}

/**
 * Generate guidance for format/type validation issues
 */
function generateFormatGuidance(
  formatErrors: any[],
  schema: any
): string[] {
  const guidance: string[] = []

  if (formatErrors.length === 0) return guidance

  // Categorize errors by type
  const typeErrors = formatErrors.filter(e => e.keyword === 'type')
  const requiredErrors = formatErrors.filter(e => e.keyword === 'required')
  const formatViolations = formatErrors.filter(e => e.keyword === 'format')
  const enumErrors = formatErrors.filter(e => e.keyword === 'enum')
  const patternErrors = formatErrors.filter(e => e.keyword === 'pattern')

  // Type mismatch errors
  if (typeErrors.length > 0) {
    const typeIssues = new Map<string, string[]>()

    typeErrors.forEach(err => {
      const path = err.path || 'root'
      const message = err.message || ''

      if (!typeIssues.has(path)) {
        typeIssues.set(path, [])
      }
      typeIssues.get(path)!.push(message)
    })

    typeIssues.forEach((messages, path) => {
      const expectedType = messages[0].replace('must be ', '')
      const fieldName = path.replace(/^\//, '').replace(/\//g, '.')

      guidance.push(
        `❌ Type Error (${fieldName}): Add to prompt: "The '${fieldName}' field must be ${expectedType}, not a different type. Example: ${getExampleForType(expectedType)}"`
      )
    })
  }

  // Required field errors (caught at Level 3, not Level 2)
  if (requiredErrors.length > 0) {
    guidance.push(
      `⚠️ Required Fields: Some required fields are missing from nested objects. Ensure all nested required properties are included.`
    )
  }

  // Format violations (dates, emails, etc.)
  if (formatViolations.length > 0) {
    const formats = new Set(formatViolations.map(e => {
      // Extract format from error message or path
      return extractFormat(e, schema)
    }).filter(Boolean))

    formats.forEach(format => {
      guidance.push(getFormatGuidance(format as string))
    })
  }

  // Enum errors
  if (enumErrors.length > 0) {
    enumErrors.forEach(err => {
      const path = err.path?.replace(/^\//, '').replace(/\//g, '.') || 'field'
      const propSchema = getSchemaForPath(schema, err.path || '')
      const allowedValues = propSchema?.enum || []

      guidance.push(
        `❌ Invalid Value (${path}): Must be one of: ${allowedValues.map((v: any) => `"${v}"`).join(', ')}`
      )
    })
  }

  // Pattern errors (regex)
  if (patternErrors.length > 0) {
    guidance.push(
      `⚠️ Format Pattern: Some fields don't match expected patterns. Add specific format examples in prompt (e.g., phone: "+1-555-123-4567", postal: "12345").`
    )
  }

  return guidance
}

/**
 * Get example value for a property schema
 */
function getExampleValue(propSchema: any): string {
  if (!propSchema) return 'null'

  switch (propSchema.type) {
    case 'string':
      if (propSchema.format === 'date') return '"2024-01-15"'
      if (propSchema.format === 'email') return '"user@example.com"'
      if (propSchema.enum) return `"${propSchema.enum[0]}"`
      return '"example"'
    case 'number':
    case 'integer':
      return '0'
    case 'boolean':
      return 'false'
    case 'array':
      return '[]'
    case 'object':
      return '{}'
    default:
      return 'null'
  }
}

/**
 * Get example for a type name
 */
function getExampleForType(typeName: string): string {
  switch (typeName) {
    case 'string': return '"text here"'
    case 'number': return '123'
    case 'integer': return '42'
    case 'boolean': return 'true or false'
    case 'array': return '[item1, item2]'
    case 'object': return '{key: value}'
    default: return typeName
  }
}

/**
 * Extract format type from error and schema
 */
function extractFormat(error: any, schema: any): string | null {
  const path = error.path || ''
  const propSchema = getSchemaForPath(schema, path)
  return propSchema?.format || null
}

/**
 * Get schema for a specific path (e.g., "/user/name")
 */
function getSchemaForPath(schema: any, path: string): any {
  if (!path) return schema

  const parts = path.split('/').filter(p => p)
  let current = schema

  for (const part of parts) {
    if (current.properties && current.properties[part]) {
      current = current.properties[part]
    } else if (current.items) {
      current = current.items
    } else {
      return null
    }
  }

  return current
}

/**
 * Get format-specific guidance
 */
function getFormatGuidance(format: string): string {
  switch (format) {
    case 'date':
      return '❌ Date Format: Add to prompt: "Dates must be in ISO 8601 format: YYYY-MM-DD (e.g., 2024-01-15)"'
    case 'date-time':
      return '❌ DateTime Format: Add to prompt: "DateTimes must be in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ (e.g., 2024-01-15T14:30:00Z)"'
    case 'email':
      return '❌ Email Format: Add to prompt: "Emails must be valid format: user@domain.com"'
    case 'uri':
    case 'url':
      return '❌ URL Format: Add to prompt: "URLs must include protocol: https://example.com"'
    case 'uuid':
      return '❌ UUID Format: Add to prompt: "UUIDs must be valid format: 123e4567-e89b-12d3-a456-426614174000"'
    default:
      return `⚠️ Format Violation: Ensure '${format}' format is followed exactly as specified.`
  }
}

/**
 * Aggregate common guidance from multiple runs
 */
export function aggregateGuidance(guidanceArrays: string[][]): string[] {
  // Count frequency of each guidance message
  const guidanceCount = new Map<string, number>()

  guidanceArrays.forEach(arr => {
    arr.forEach(msg => {
      guidanceCount.set(msg, (guidanceCount.get(msg) || 0) + 1)
    })
  })

  // Sort by frequency (most common first)
  const sorted = Array.from(guidanceCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([msg, count]) => {
      // Add frequency indicator for common issues
      if (count > 1) {
        return `${msg} (${count}× occurrences)`
      }
      return msg
    })

  return sorted
}
