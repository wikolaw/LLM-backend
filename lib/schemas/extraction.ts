import { z } from 'zod'

// Entity types for generic document analysis
export const EntitySchema = z.object({
  type: z.string().describe('Type of entity (e.g., person, organization, location, date, etc.)'),
  text: z.string().describe('The extracted text/value of the entity'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence score for the extraction (0-1)'),
})

export const AmountSchema = z.object({
  value: z.number().describe('Numeric value of the amount'),
  currency: z.string().optional().describe('Currency code (e.g., SEK, USD, EUR)'),
  context: z.string().optional().describe('Context or description of what this amount represents'),
})

// Main extraction schema for generic document analysis
export const DocumentExtractionSchema = z.object({
  entities: z.array(EntitySchema).describe('List of named entities extracted from the document'),
  key_dates: z.array(z.string()).describe('Important dates mentioned in the document'),
  amounts: z.array(AmountSchema).describe('Monetary amounts or significant numbers found'),
  summary: z.string().describe('A brief summary of the document content'),
  language: z.string().describe('Primary language of the document (e.g., "sv" for Swedish, "en" for English)'),
  document_type: z.string().optional().describe('Type of document if identifiable (e.g., invoice, contract, report)'),
  key_topics: z.array(z.string()).optional().describe('Main topics or themes discussed in the document'),
})

export type DocumentExtraction = z.infer<typeof DocumentExtractionSchema>
export type Entity = z.infer<typeof EntitySchema>
export type Amount = z.infer<typeof AmountSchema>

// JSON Schema format for LLM responses (following OpenAI/Anthropic format)
export const extractionJsonSchema = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      description: 'List of named entities extracted from the document',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Type of entity (e.g., person, organization, location, date, etc.)',
          },
          text: {
            type: 'string',
            description: 'The extracted text/value of the entity',
          },
          confidence: {
            type: 'number',
            description: 'Confidence score for the extraction (0-1)',
            minimum: 0,
            maximum: 1,
          },
        },
        required: ['type', 'text'],
      },
    },
    key_dates: {
      type: 'array',
      description: 'Important dates mentioned in the document',
      items: {
        type: 'string',
      },
    },
    amounts: {
      type: 'array',
      description: 'Monetary amounts or significant numbers found',
      items: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            description: 'Numeric value of the amount',
          },
          currency: {
            type: 'string',
            description: 'Currency code (e.g., SEK, USD, EUR)',
          },
          context: {
            type: 'string',
            description: 'Context or description of what this amount represents',
          },
        },
        required: ['value'],
      },
    },
    summary: {
      type: 'string',
      description: 'A brief summary of the document content',
    },
    language: {
      type: 'string',
      description: 'Primary language of the document (e.g., "sv" for Swedish, "en" for English)',
    },
    document_type: {
      type: 'string',
      description: 'Type of document if identifiable (e.g., invoice, contract, report)',
    },
    key_topics: {
      type: 'array',
      description: 'Main topics or themes discussed in the document',
      items: {
        type: 'string',
      },
    },
  },
  required: ['entities', 'key_dates', 'amounts', 'summary', 'language'],
}

// CONTRACT SPECIFIC SCHEMA (for Swedish railway infrastructure contracts)
export const ContractPartySchema = z.object({
  namn: z.string().optional().describe('Party name'),
  org_nr: z.string().optional().describe('Organization number'),
  representant: z.string().optional().describe('Representative name'),
  titel: z.string().optional().describe('Representative title'),
})

export const ContractExtractionSchema = z.object({
  allmant: z.object({
    kontraktsnamn: z.string().optional(),
    anlaggning_objekt: z.string().optional(),
    kontraktstyp: z.string().optional(),
    datum_tecknat: z.string().optional(),
    startdatum: z.string().optional(),
    slutdatum: z.string().optional(),
    beskrivning: z.string().optional(),
  }).optional(),

  parter: z.object({
    bestallare: ContractPartySchema.optional(),
    entreprenor: ContractPartySchema.optional(),
    underskrifter: z.array(z.string()).optional(),
  }).optional(),

  ekonomi: z.object({
    arlig_ersattning_belopp: z.number().optional(),
    arlig_ersattning_valuta: z.string().optional(),
    indexjustering_typ: z.string().optional(),
    indexjustering_frekvens: z.string().optional(),
    ovriga_ekonomiska_villkor: z.array(z.string()).optional(),
  }).optional(),

  infrastruktur: z.object({
    sparlangd_km: z.number().optional(),
    spartyp: z.string().optional(),
    antal_vaxlar: z.number().optional(),
    tekniska_system: z.array(z.string()).optional(),
  }).optional(),

  ansvar: z.object({
    entreprenorens_ansvar: z.array(z.string()).optional(),
    bestellarens_ansvar: z.array(z.string()).optional(),
    regelverk: z.array(z.string()).optional(),
  }).optional(),

  kvalitet_sakerhet: z.object({
    certifieringar: z.array(z.string()).optional(),
    utbildningskrav: z.array(z.string()).optional(),
    miljo_ledningssystem: z.array(z.string()).optional(),
  }).optional(),

  andringar: z.object({
    reglering: z.string().optional(),
    beloppsgranser: z.string().optional(),
  }).optional(),

  bilagor: z.array(z.string()).optional(),
})

export type ContractExtraction = z.infer<typeof ContractExtractionSchema>

// JSON Schema for contract extraction
export const contractJsonSchema = {
  type: 'object',
  properties: {
    allmant: {
      type: 'object',
      description: 'General contract information',
      properties: {
        kontraktsnamn: { type: 'string' },
        anlaggning_objekt: { type: 'string' },
        kontraktstyp: { type: 'string' },
        datum_tecknat: { type: 'string' },
        startdatum: { type: 'string' },
        slutdatum: { type: 'string' },
        beskrivning: { type: 'string' },
      },
    },
    parter: {
      type: 'object',
      description: 'Contract parties',
      properties: {
        bestallare: {
          type: 'object',
          properties: {
            namn: { type: 'string' },
            org_nr: { type: 'string' },
            representant: { type: 'string' },
            titel: { type: 'string' },
          },
        },
        entreprenor: {
          type: 'object',
          properties: {
            namn: { type: 'string' },
            org_nr: { type: 'string' },
            representant: { type: 'string' },
            titel: { type: 'string' },
          },
        },
        underskrifter: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    ekonomi: {
      type: 'object',
      description: 'Economic terms',
      properties: {
        arlig_ersattning_belopp: { type: 'number' },
        arlig_ersattning_valuta: { type: 'string' },
        indexjustering_typ: { type: 'string' },
        indexjustering_frekvens: { type: 'string' },
        ovriga_ekonomiska_villkor: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    infrastruktur: {
      type: 'object',
      description: 'Infrastructure details',
      properties: {
        sparlangd_km: { type: 'number' },
        spartyp: { type: 'string' },
        antal_vaxlar: { type: 'number' },
        tekniska_system: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    ansvar: {
      type: 'object',
      description: 'Responsibilities',
      properties: {
        entreprenorens_ansvar: {
          type: 'array',
          items: { type: 'string' },
        },
        bestellarens_ansvar: {
          type: 'array',
          items: { type: 'string' },
        },
        regelverk: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    kvalitet_sakerhet: {
      type: 'object',
      description: 'Quality and safety requirements',
      properties: {
        certifieringar: {
          type: 'array',
          items: { type: 'string' },
        },
        utbildningskrav: {
          type: 'array',
          items: { type: 'string' },
        },
        miljo_ledningssystem: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    andringar: {
      type: 'object',
      description: 'Change management',
      properties: {
        reglering: { type: 'string' },
        beloppsgranser: { type: 'string' },
      },
    },
    bilagor: {
      type: 'array',
      description: 'List of appendices',
      items: { type: 'string' },
    },
  },
}

/**
 * Dynamic system prompt - adapts to output format (JSON or JSON Lines)
 * Version 2.0 - Generic data extraction model
 */
export function getSystemPrompt(outputFormat: 'json' | 'jsonl'): string {
  const formatText = outputFormat === 'json' ? 'JSON' : 'JSON Lines'

  return `You are an information extraction model.
Your task is to convert unstructured text into structured data for database ingestion.
Always return output **exactly** in the format and structure defined by the user prompt.
Be consistent across all responses — use the same field names, data types, and formatting rules every time.
Do not include explanations, reasoning, or extra text.
If data is missing, return \`null\` for that field.
If a field cannot be confidently determined, still include it with \`null\`.
Output must be valid ${formatText} syntax at all times.`
}

/**
 * Format recommendations for UI display
 */
export const FORMAT_RECOMMENDATIONS = {
  json: {
    title: 'JSON (Single Object)',
    description: 'Best for single documents or small batches. Returns one JSON object per document.',
    pros: [
      'Easy to read and debug',
      'Standard format widely supported',
      'Good for complex nested structures',
      'Simple to validate and parse'
    ],
    cons: [
      'Less efficient for bulk processing',
      'Entire object must be valid',
      'Not suitable for streaming large datasets'
    ],
    example: `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}`
  },
  jsonl: {
    title: 'JSON Lines (Streaming Format)',
    description: 'Best for bulk processing. Returns one JSON object per line.',
    pros: [
      'Efficient for streaming and large datasets',
      'Process line-by-line incrementally',
      'Resilient - one bad line doesn\'t break entire output',
      'Ideal for batch processing multiple records'
    ],
    cons: [
      'Harder to read and debug',
      'Each line must be individually valid JSON',
      'Less common format, requires special handling'
    ],
    example: `{"name": "John Doe", "age": 30}
{"name": "Jane Smith", "age": 25}
{"name": "Bob Johnson", "age": 35}`
  }
} as const

export type OutputFormat = 'json' | 'jsonl'
