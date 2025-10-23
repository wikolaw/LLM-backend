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

// Default prompts
export const DEFAULT_SYSTEM_PROMPT = `You are a precise document extraction assistant specializing in Swedish text analysis.

OUTPUT REQUIREMENTS - CRITICAL:
1. Your response must contain ONLY valid JSON - nothing else
2. Do NOT include markdown formatting (no \`\`\`json or \`\`\` tags)
3. Do NOT add any text, explanations, or comments before or after the JSON
4. Start your response with { and end with }
5. Your output will be parsed directly by JSON.parse() - it must be perfect

FIELD NAMES - EXACT MATCH REQUIRED:
Copy these field names EXACTLY as shown. Do not rename, translate, or modify them:
- kontraktsnamn (not "kontrakts_namn" or "Kontraktsnamn")
- anlaggning_objekt (not "anläggning" or "objekt")
- arlig_ersattning_belopp (not "årlig_ersättning" or "belopp")
All field names must match the schema precisely.

DATE FORMAT - ISO 8601 ONLY:
- Format: YYYY-MM-DD (example: "2024-03-01")
- Do NOT use: "2024/03/01", "1 mars 2024", "March 1, 2024"
- Invalid dates should be null

NUMBER FORMAT - NUMERIC TYPE ONLY:
- Use pure numbers: 24500000 (not strings)
- Do NOT include: spaces "24 500 000", commas "24,500,000", currency "24500000 SEK"
- The JSON field must be a numeric type: "arlig_ersattning_belopp": 24500000
- Missing numbers should be null

STRING VALUES:
- Extract Swedish text verbatim including å, ä, ö characters
- Use double quotes for all strings
- Empty values should be null (not "")

ARRAY VALUES:
- Empty arrays should be []
- Do not use null for arrays, use empty array []

DATA EXTRACTION RULES:
- Extract facts verbatim from Swedish text without interpretation
- Use null for missing values - never leave fields undefined
- Do not add fields not in the schema
- Do not omit fields from the schema (include them with null if missing)

QUALITY PRIORITY: Accuracy is more important than speed. Take time to extract all information correctly.`

export const DEFAULT_USER_PROMPT_GENERIC = `Analyze the following document and extract structured information according to the schema.

Document text:
{DOCUMENT_TEXT}

Extract the information in JSON format matching the provided schema.`

export const DEFAULT_USER_PROMPT_CONTRACT = `Läs avtalet nedan och extrahera alla relevanta uppgifter för strukturerad lagring i databas.

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

Lämna fält tomt (null) om information saknas.
Extrahera fakta ordagrant utan egna tolkningar.

Avtalets text:
{DOCUMENT_TEXT}

Returnera resultatet som giltig JSON enligt det angivna schemat.`
