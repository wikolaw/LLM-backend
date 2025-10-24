/**
 * AI-Powered Prompt Optimizer
 * Uses GPT-4 Mini to enhance user's basic extraction requirements with best practices
 * Version 2.0
 */

import type { OutputFormat } from '../schemas/extraction'

/**
 * Optimize user's prompt with AI (GPT-4 Mini via OpenRouter)
 *
 * @param userPrompt - User's basic description of what to extract
 * @param outputFormat - json or jsonl
 * @returns Optimized prompt with explicit field names, types, and format requirements
 */
export async function optimizePrompt(
  userPrompt: string,
  outputFormat: OutputFormat
): Promise<string> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable not set')
  }

  const formatText = outputFormat === 'json' ? 'JSON' : 'JSON Lines'
  const formatExample =
    outputFormat === 'json'
      ? `{
  "contract_name": "string",
  "start_date": "YYYY-MM-DD",
  "total_amount": 1234567
}`
      : `{"contract_name": "Example", "start_date": "2024-01-01"}
{"contract_name": "Another", "start_date": "2024-02-01"}`

  const systemMessage = `You are an expert at writing data extraction prompts for LLMs.

Your task: Take a user's basic extraction requirements and enhance it with best practices.

REQUIREMENTS:
1. Identify explicit field names (use snake_case)
2. Specify data types for each field (string, number, boolean, array, object)
3. Add format specifications:
   - Dates: ISO 8601 format (YYYY-MM-DD)
   - Numbers: numeric type, not strings
   - Missing data: use null
4. Mention the output format: ${formatText}
5. Be concise but complete (2-4 paragraphs max)

OUTPUT FORMAT: ${formatText}
${outputFormat === 'jsonl' ? 'Note: Each line should be a separate, complete JSON object.' : 'Note: Return a single JSON object.'}

EXAMPLE OUTPUT:
Extract the following information from the document and return as ${formatText}:

- contract_name (string): The name or title of the contract
- parties (object): Contracting parties with fields: customer_name, supplier_name
- start_date (string): Contract start date in ISO 8601 format (YYYY-MM-DD)
- end_date (string): Contract end date in ISO 8601 format (YYYY-MM-DD)
- total_amount (number): Total contract value as a number (no currency symbols)
- currency (string): Currency code (e.g., "SEK", "USD", "EUR")

Format requirements:
- Use null for missing values
- Dates must be YYYY-MM-DD format
- Numbers must be numeric types, not strings
${outputFormat === 'jsonl' ? '- Return one JSON object per line' : '- Return a single JSON object'}

Example structure:
${formatExample}

Return ONLY the optimized prompt, no explanations.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/wikolaw/LLM-backend',
      'X-Title': 'LLM Document Extraction'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini', // Cost-effective for prompt optimization
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Low temperature for consistent, structured output
      max_tokens: 1000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const optimizedPrompt = data.choices?.[0]?.message?.content

  if (!optimizedPrompt) {
    throw new Error('No optimized prompt returned from API')
  }

  return optimizedPrompt.trim()
}
