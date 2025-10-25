/**
 * Test Data for API Tests
 * Sample prompts, documents, schemas, and expected responses
 */

import path from 'path'
import fs from 'fs'

/**
 * Sample user prompts for testing
 */
export const SAMPLE_PROMPTS = {
  swedish_contract: `Läs avtalet nedan och extrahera alla relevanta uppgifter för strukturerad lagring i databas.

Syftet är att analysera och jämföra entreprenadkontrakt för drift och underhåll av järnvägsinfrastruktur.

Identifiera och returnera följande informationskategorier:

1. Allmän info: kontraktsnamn, anläggning/objekt, kontraktstyp, datum tecknat, start- och slutdatum, kort beskrivning av omfattning.

2. Parter: beställare (namn, org.nr, representant, titel), entreprenör (namn, org.nr, representant, titel), underskrifter.

3. Ekonomi: årlig ersättning (belopp, valuta), indexjustering (typ och frekvens), villkor för avfall/deponi/destruktion, övriga ekonomiska regler.

4. Infrastruktur: spårlängd, spårtyp, antal växlar, tekniska system (kontaktledning, signal, tunnel etc.).

5. Ansvar: entreprenörens ansvar, beställarens ansvar, hänvisade regelverk (t.ex. ABT 06).

6. Kvalitet & säkerhet: certifieringar (ISO 9001/14001/45001), utbildnings- och behörighetskrav, miljö- och ledningssystem.

7. Ändringar: hur tilläggsarbeten/ändringar regleras, ev. beloppsgränser eller kostnadsdelning.

8. Bilagor: lista över hänvisade bilagor eller dokument.

Lämna fält tomt om information saknas.
Extrahera fakta ordagrant utan egna tolkningar.`,

  english_invoice: `Extract the following information from the invoice:

1. Invoice number and date
2. Supplier and customer details (name, address, tax ID)
3. Line items (description, quantity, unit price, total)
4. Subtotal, tax, and total amount
5. Payment terms and due date

Return as structured JSON.`,

  simple_extraction: `Extract the name, date, and amount from this document.`
}

/**
 * Sample document paths (relative to project root)
 */
export const SAMPLE_DOCUMENTS = [
  '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx',
  '01 Entreprenadkontrakt - Drift och underhåll Botniabanan.docx',
  '01 Entreprenadkontrakt - Drift och underhåll Citybanan.docx'
]

/**
 * Get absolute paths to sample documents
 */
export function getSampleDocumentPaths(count: number = 3): string[] {
  const basePath = path.join(process.cwd(), 'Sample documents')
  return SAMPLE_DOCUMENTS.slice(0, count).map(doc => path.join(basePath, doc))
}

/**
 * Read sample document content
 */
export function readSampleDocument(filename: string): Buffer {
  const filePath = path.join(process.cwd(), 'Sample documents', filename)
  return fs.readFileSync(filePath)
}

/**
 * Read the sample user prompt from markdown file
 */
export function readSamplePrompt(): string {
  const promptPath = path.join(process.cwd(), 'Sample documents', 'sample user prompt.md')
  return fs.readFileSync(promptPath, 'utf-8')
}

/**
 * Sample JSON schemas for testing
 */
export const SAMPLE_SCHEMAS = {
  simple: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      date: { type: 'string', format: 'date' },
      amount: { type: 'number' }
    },
    required: ['name']
  },

  contract: {
    type: 'object',
    properties: {
      contract_name: { type: 'string' },
      parties: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          supplier_name: { type: 'string' }
        }
      },
      dates: {
        type: 'object',
        properties: {
          signature_date: { type: ['string', 'null'], format: 'date' },
          start_date: { type: ['string', 'null'], format: 'date' },
          end_date: { type: ['string', 'null'], format: 'date' }
        }
      },
      financial: {
        type: 'object',
        properties: {
          total_amount: { type: ['number', 'null'] },
          currency: { type: ['string', 'null'] }
        }
      }
    },
    required: ['contract_name']
  }
}

/**
 * Sample model identifiers for testing
 */
export const TEST_MODELS = {
  fast_free: [
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-exp'
  ],
  premium: [
    'anthropic/claude-sonnet-4-5',
    'openai/gpt-4o'
  ],
  budget: [
    'meta-llama/llama-3.3-70b-instruct',
    'nvidia/llama-3.3-nemotron-super-49b'
  ]
}

/**
 * Expected prompt optimization characteristics
 */
export const OPTIMIZATION_EXPECTATIONS = {
  minWords: 400,
  maxWords: 800,
  requiredSections: [
    'DOCUMENT CONTEXT',
    'REQUIRED FIELDS',
    'FORMAT STANDARDS',
    'EXTRACTION RULES',
    'OUTPUT FORMAT'
  ],
  requiredFormatStandards: [
    'ISO 8601',
    'YYYY-MM-DD'
  ]
}

/**
 * System prompt for extraction (from schemas/extraction.ts)
 */
export const SYSTEM_PROMPT = `You are a highly accurate data extraction assistant. Your task is to read the provided document text and extract structured information according to the user's requirements.

IMPORTANT RULES:
1. Extract information EXACTLY as it appears in the document
2. Do NOT invent, infer, or hallucinate information not present in the text
3. Use null for any field that cannot be found in the document
4. Follow the specified output format precisely (JSON or JSON Lines)
5. Ensure all required fields are present in the output
6. Pay careful attention to data types (string, number, boolean, array, object)
7. For dates, convert to the specified format (typically YYYY-MM-DD)
8. For numbers, remove currency symbols and formatting (commas, spaces)

Your response must be valid JSON that matches the validation schema provided.`
