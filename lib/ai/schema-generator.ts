/**
 * AI-Powered JSON Schema Generator
 * Uses GPT-4 Mini to generate valid JSON Schema from extraction prompts
 * Version 2.0
 */

import type { OutputFormat } from '../schemas/extraction'

/**
 * Generate JSON Schema from prompts using AI (GPT-4 Mini via OpenRouter)
 *
 * @param userPrompt - User's basic extraction requirements
 * @param optimizedPrompt - AI-optimized extraction prompt with field details
 * @param outputFormat - json or jsonl
 * @returns Valid JSON Schema object (draft-07)
 */
export async function generateJSONSchema(
  userPrompt: string,
  optimizedPrompt: string,
  outputFormat: OutputFormat
): Promise<object> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable not set')
  }

  const formatNote =
    outputFormat === 'jsonl'
      ? 'Note: This schema validates individual JSON objects (one per line in JSON Lines format).'
      : 'Note: This schema validates a single JSON object.'

  const exampleSchema = outputFormat === 'json'
    ? `{
  "type": "object",
  "properties": {
    "contract_name": {
      "type": "string",
      "description": "The name or title of the contract"
    },
    "start_date": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Contract start date in ISO 8601 format (YYYY-MM-DD)"
    },
    "end_date": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Contract end date (optional)"
    },
    "total_amount": {
      "type": ["number", "null"],
      "description": "Total contract value as a number (use null if not found)"
    },
    "parties": {
      "type": "object",
      "properties": {
        "customer_name": { "type": "string" },
        "supplier_name": { "type": "string" },
        "customer_org_id": { "type": ["string", "null"] }
      },
      "required": ["customer_name", "supplier_name"]
    }
  },
  "required": ["contract_name"]
}`
    : `{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Person or entity name"
    },
    "date": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Date in ISO 8601 format (optional)"
    },
    "amount": {
      "type": ["number", "null"],
      "description": "Numeric amount (use null if not found)"
    }
  },
  "required": ["name"]
}`

  const systemMessage = `You are an expert at writing JSON Schema (draft-07) for data validation.

Your task: Generate a valid JSON Schema from the extraction prompt.

REQUIREMENTS:
1. Use JSON Schema draft-07 specification
2. Include "type": "object" at root level
3. Define all fields mentioned in the prompt under "properties"
4. Specify correct types: string, number, boolean, array, object, null
5. Add "description" for each field
6. Use "required" array for mandatory fields ONLY
7. For dates, use: "type": "string", "format": "date"
8. For nested objects, define nested "properties"
9. For arrays, use "type": "array" with "items" schema
10. **IMPORTANT - Nullable Fields:** For fields NOT in the "required" array, allow null values using type array syntax:
    - Optional string: "type": ["string", "null"]
    - Optional number: "type": ["number", "null"]
    - Optional boolean: "type": ["boolean", "null"]
    - This matches the extraction prompt's instruction to return null for missing data
11. Required fields should NOT be nullable (use single type: "type": "string")

${formatNote}

EXAMPLE OUTPUT:
${exampleSchema}

Return ONLY the JSON Schema object, no explanations, no markdown formatting.`

  const promptText = `User's original request:
${userPrompt}

Optimized extraction prompt:
${optimizedPrompt}

Generate a JSON Schema that validates the expected output structure.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/wikolaw/LLM-backend',
      'X-Title': 'LLM Document Extraction'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini', // Cost-effective for schema generation
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: promptText }
      ],
      temperature: 0.1, // Very low temperature for structured, deterministic output
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  let schemaText = data.choices?.[0]?.message?.content

  if (!schemaText) {
    throw new Error('No schema returned from API')
  }

  // Clean up potential markdown formatting
  schemaText = schemaText.trim()
  if (schemaText.startsWith('```json')) {
    schemaText = schemaText.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
  } else if (schemaText.startsWith('```')) {
    schemaText = schemaText.replace(/```\n?/g, '').replace(/```\n?$/g, '')
  }

  try {
    const schema = JSON.parse(schemaText)
    return schema
  } catch (e) {
    throw new Error(`Failed to parse generated schema as JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
}
