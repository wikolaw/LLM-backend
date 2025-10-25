/**
 * AI-Powered Prompt Optimizer
 * Uses GPT-4o-mini to transform basic extraction requirements into comprehensive,
 * detailed prompts (400-800 words) that work across ANY language, domain, or document type.
 * Version 3.0 - Universal Flexible Optimizer
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

  const systemMessage = `You are an expert at writing comprehensive data extraction prompts for multi-model LLM systems.

Your task: Transform a user's basic extraction requirements into a detailed, comprehensive prompt (400-800 words) that works effectively across different languages, domains, and document types.

CORE PRINCIPLES:
1. Generate detailed, specific instructions (aim for 400-800 words)
2. Detect language/domain from user input and adapt accordingly
3. Provide clear field specifications with examples
4. Include universal format standards (ISO 8601 dates, ISO currency codes, etc.)
5. Add extraction rules for handling ambiguity and missing data
6. Remain domain-agnostic while being comprehensive

OUTPUT STRUCTURE:
Your optimized prompt should include these sections:

1. DOCUMENT CONTEXT (1-2 sentences)
   - Brief description of expected document type based on user input
   - Note if documents may be in specific languages

2. REQUIRED FIELDS (Main section, most detailed)
   For each field:
   - Field name in snake_case
   - Data type: string | number | boolean | array | object | null
   - Clear description with extraction guidance
   - Example value(s) when helpful
   - For objects: specify nested structure
   - For arrays: specify element type and handling of multiple values

3. FORMAT STANDARDS
   - Dates: ISO 8601 (YYYY-MM-DD) or more specific if needed (YYYY-MM-DD HH:MM:SS)
   - Numbers: Always numeric type, never strings. Remove currency symbols, commas, spaces
   - Currency: ISO 4217 codes (USD, EUR, SEK, etc.)
   - Language codes: ISO 639-1 when applicable (en, sv, de)
   - Text normalization: Trim whitespace, normalize line breaks
   - Phone numbers: Keep original format or specify E.164 if standardization needed
   - Percentages: As decimal numbers (0.15 for 15%) or with clear format

4. EXTRACTION RULES
   - Missing fields: Use null (never omit fields or use empty strings unless specified)
   - Ambiguous data: Preserve original text, prioritize exact matches
   - Multiple values: Use arrays, specify order (chronological, document order, etc.)
   - Inconsistent formatting: Standardize according to format rules
   - Multi-language content: Preserve original language unless translation requested
   - Uncertain extractions: Include with original text, don't invent data
   - Nested data: Clearly specify parent-child relationships

5. OUTPUT FORMAT
   - Specify: ${formatText}
   ${outputFormat === 'jsonl' ? '- Each line is a separate, complete JSON object (newline-delimited)' : '- Return a single JSON object'}
   - Must be valid JSON syntax
   - All fields must be present (use null if missing)

EXAMPLE APPROACH (Contract Extraction):

"Extract structured data from contract documents and return as ${formatText}.

DOCUMENT CONTEXT:
Expected documents are legal contracts which may be in Swedish, English, or other languages. Documents may include project agreements, service contracts, or procurement contracts.

REQUIRED FIELDS:

- contract_name (string): The official title or name of the contract/agreement. Look for headings, title pages, or "Avtal" sections. Example: "Projektavtal för Arlandabanan".

- parties (object): The contracting parties with nested structure:
  - customer_name (string): The client/buyer organization name
  - customer_org_id (string|null): Organization ID if present (e.g., Swedish org number)
  - supplier_name (string): The contractor/seller organization name
  - supplier_org_id (string|null): Organization ID if present
  Example: {"customer_name": "Banverket", "customer_org_id": "202100-1234", "supplier_name": "ACME AB", "supplier_org_id": null}

- dates (object): Key contract dates:
  - signature_date (string|null): Date contract was signed, format YYYY-MM-DD
  - start_date (string|null): Contract start/effective date, format YYYY-MM-DD
  - end_date (string|null): Contract end/expiry date, format YYYY-MM-DD

- financial (object): Financial information:
  - total_amount (number|null): Total contract value as number (remove currency symbols, spaces, commas). Example: 15000000 for "15 000 000 SEK"
  - currency (string|null): ISO 4217 currency code. Example: "SEK", "EUR", "USD"

FORMAT STANDARDS:
- Dates: ISO 8601 format YYYY-MM-DD (convert from any format like "24 januari 2024" → "2024-01-24")
- Numbers: Numeric type only, remove all formatting (spaces, commas, currency symbols)
- Currency: ISO 4217 codes (SEK for Swedish Krona, USD for US Dollar)
- Text: Trim whitespace, preserve original language

EXTRACTION RULES:
- Use null for any field that cannot be found (never use empty string "" or omit fields)
- If dates are in text format (e.g., "januari 2024"), convert to YYYY-MM-DD
- If multiple values exist (e.g., multiple dates), use the most prominent or earliest
- Preserve original language for text fields unless translation specified
- For ambiguous amounts, extract the clearly stated total contract value
- If contract uses "från X till Y", start_date=X, end_date=Y

OUTPUT FORMAT: ${formatText}
${outputFormat === 'jsonl' ? 'Return one JSON object per document/contract as separate lines.' : 'Return a single JSON object for the document.'}
All fields must be present in output. Use null for missing values."

TASK:
Transform the user's input below into a comprehensive prompt following this structure. Adapt field names, descriptions, and examples to match their specific extraction needs while maintaining this level of detail and clarity.

Return ONLY the optimized prompt, no meta-commentary or explanations.`

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
      max_tokens: 2000 // Increased for comprehensive 400-800 word prompts
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
