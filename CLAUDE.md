# 🤖 Claude AI Assistant - Project Context

**Last Updated:** 2025-10-24
**Project:** Swedish Document Extraction with Multi-Model LLM & JSON Schema Validation
**Status:** ✅ v2.0 Production-Ready (AI-Powered Schema Validation)
**GitHub:** https://github.com/wikolaw/LLM-backend

---

## 📋 Quick Context

This project extracts structured data from Swedish railway contract documents using multiple LLMs with **AI-powered JSON Schema validation**. Users describe what they want to extract, AI optimizes the prompt and generates a validation schema, then multiple models compete to produce schema-valid JSON.

**Key Innovation (v2.0):** AI-powered workflow where GPT-4 Mini optimizes user prompts and generates JSON Schemas automatically, enabling flexible extraction for any document type without hardcoded schemas.

---

## 🎯 Project Purpose

**Problem:** When extracting data from Swedish documents using LLMs, users need flexible extraction that adapts to their specific needs, not pre-defined schemas.

**Solution:**
1. User describes extraction needs in plain language
2. AI optimizes the prompt with explicit field names and types
3. AI generates a JSON Schema for validation
4. Multiple LLMs extract data in parallel
5. Outputs are validated against the schema

**Use Case:** Railway infrastructure contracts in Swedish (e.g., Arlandabanan, Botniabanan) extracted into any structure the user needs.

---

## 🏗️ Architecture (v2.0)

```
Frontend (Next.js 14)
  ↓
User describes extraction needs
  ↓
API Route: /api/optimize-prompt (GPT-4 Mini)
  ↓
API Route: /api/generate-schema (GPT-4 Mini)
  ↓
Supabase Auth + Database (PostgreSQL)
  ↓
Edge Function: run-llm-inference
  ↓
OpenRouter API (Multi-model LLM inference)
  ↓
JSON Schema Validation (Ajv)
  ↓
Results: ✅ Validated / ❌ Failed Validation
```

### Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth)
- **AI Services:** GPT-4 Mini (prompt optimization + schema generation)
- **LLM Gateway:** OpenRouter API (multi-model access)
- **Validation:** Ajv (JSON Schema draft-07)
- **Testing:** Playwright (E2E), Supabase MCP
- **Deployment:** Supabase Edge Functions (Deno), Vercel (frontend)

---

## 🔬 JSON Schema Validation System (v2.0)

The new AI-powered validation approach:

### 1. User Input → AI Optimization
- User enters plain language (e.g., "Extract contract name, parties, dates, amounts")
- GPT-4 Mini expands into optimized prompt with:
  - Explicit field names (snake_case)
  - Data types specified
  - Format requirements (YYYY-MM-DD for dates)
  - Output format instructions (JSON or JSON Lines)

**Example:**
```
Input: "Extract contract details"
AI Output: "Extract the following fields:
- contract_name: string, the official name
- parties: object with customer_name and supplier_name
- start_date: string in YYYY-MM-DD format
- total_amount: number (not string)
Return as valid JSON object."
```

### 2. AI-Generated JSON Schema
- GPT-4 Mini generates valid JSON Schema (draft-07) from optimized prompt
- Schema includes:
  - Type definitions (`type: "object"`, `type: "string"`, etc.)
  - Required fields
  - Property descriptions
  - Format constraints (`format: "date"`)

**Example Schema:**
```json
{
  "type": "object",
  "properties": {
    "contract_name": { "type": "string", "description": "Contract title" },
    "parties": {
      "type": "object",
      "properties": {
        "customer_name": { "type": "string" },
        "supplier_name": { "type": "string" }
      },
      "required": ["customer_name", "supplier_name"]
    },
    "start_date": { "type": "string", "format": "date" },
    "total_amount": { "type": "number" }
  },
  "required": ["contract_name", "parties"]
}
```

### 3. Dynamic System Prompt
System prompt adapts based on output format selection:
```
"You are an information extraction model.
...
Output must be valid JSON syntax at all times."  // or "JSON Lines syntax"
```

### 4. Validation Results
- ✅ **Validated** - Passed JSON Schema validation
- ⚠️ **Validation Failed** - Valid JSON but schema mismatch (shows errors)
- ❌ **Error** - Model error or invalid JSON

---

## 📊 Current Status (v2.0)

### ✅ Completed

1. **AI Prompt Optimizer** - GPT-4 Mini enhances user prompts
2. **AI Schema Generator** - GPT-4 Mini creates validation schemas
3. **API Routes** - Server-side endpoints for AI services
4. **Dynamic System Prompts** - Format-aware prompt generation
5. **JSON Schema Validation** - Ajv-based validation (JSON + JSON Lines)
6. **Edge Function v2.0** - Updated for schema validation
7. **Frontend v2.0** - 4-step wizard (format → input → optimize → schema)
8. **Database Migration** - New validation columns
9. **Comprehensive Testing** - E2E tests with Playwright

### 🎯 Key Features

- **Flexible Extraction** - Works for any document type, not just contracts
- **No Hardcoded Schemas** - AI generates schemas on demand
- **User-Friendly** - Plain language input, no technical knowledge needed
- **Editable** - Both optimized prompt and schema can be manually adjusted
- **Real-Time Validation** - Schema validity checked before running models
- **Format Support** - JSON (single object) or JSON Lines (streaming)

---

## 🗂️ Project Structure

```
LLM-backend/
├── app/
│   ├── api/
│   │   ├── optimize-prompt/route.ts    # NEW: AI prompt optimization
│   │   └── generate-schema/route.ts    # NEW: AI schema generation
│   ├── dashboard/page.tsx              # Updated for v2.0
│   └── auth/
│
├── components/
│   ├── prompt/PromptEditor.tsx         # REWRITTEN: 4-step wizard
│   └── results/ResultsComparison.tsx   # Updated: validation badges
│
├── lib/
│   ├── schemas/extraction.ts           # Dynamic system prompts
│   ├── ai/
│   │   ├── prompt-optimizer.ts         # NEW: GPT-4 Mini optimization
│   │   └── schema-generator.ts         # NEW: GPT-4 Mini schema gen
│   └── validation/
│       └── schema-validator.ts         # NEW: Ajv validation
│
├── supabase/functions/
│   ├── _shared/
│   │   └── schema-validator.ts         # NEW: Deno validator
│   └── run-llm-inference/              # Updated for v2.0
│
└── tests/
    └── json-schema-validation.spec.ts  # NEW: v2.0 tests
```

---

## 🔑 Key Changes from v1.0 to v2.0

| Feature | v1.0 (Quality Scoring) | v2.0 (Schema Validation) |
|---------|------------------------|--------------------------|
| **Prompt Creation** | Hardcoded schemas | AI-optimized from user input |
| **Validation** | 5-dimensional quality scores | JSON Schema validation |
| **Flexibility** | Fixed schemas only | Any extraction task |
| **User Input** | Select predefined schema | Describe extraction needs |
| **AI Services** | None | GPT-4 Mini (optimize + generate) |
| **System Prompt** | Static | Dynamic (JSON or JSON Lines) |
| **Results Display** | Quality scores (0-100) | Validation status (✅/❌) |
| **Schema Editing** | Not possible | Editable before running |

---

## 🚀 How to Use

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add: OPENROUTER_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# Start dev server
npm run dev
# Access: http://localhost:3000

# Deploy Edge Functions
export SUPABASE_ACCESS_TOKEN=your_token
npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
```

### User Workflow

1. **Upload Document** - PDF, DOCX, or TXT
2. **Choose Format** - JSON or JSON Lines
3. **Describe Extraction** - "Extract contract name, parties, dates, amounts"
4. **AI Optimizes** - Click "✨ Optimize Prompt with AI" (GPT-4 Mini)
5. **AI Generates Schema** - Click "🔧 Generate JSON Schema" (GPT-4 Mini)
6. **Review & Edit** - Adjust prompt or schema if needed
7. **Select Models** - Choose which LLMs to run
8. **Run & Compare** - See validation results

---

## ⚙️ Important Configurations

### Supabase Project
- **Project Ref:** `ughfpgtntupnedjotmrr`
- **URL:** https://ughfpgtntupnedjotmrr.supabase.co
- **Edge Functions:**
  - `run-llm-inference` (v2.0) - Schema validation

### OpenRouter
- **API Key:** Required in `.env.local`
- **Used for:** Multi-model LLM inference
- **Recommended Models:** Gemini Pro (free + JSON mode), GPT-3.5 Turbo

### Test User
- **Email:** `test@playwright.local`
- **Password:** `TestPassword123!`

---

## 🧪 Testing

### Run E2E Tests
```bash
npx playwright test json-schema-validation.spec.ts --headed
```

### Manual Testing
1. Login: `test@playwright.local` / `TestPassword123!`
2. Upload: `Sample documents/test-contract-arlanda.txt`
3. Configure extraction with AI
4. Run models and verify validation results

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | **This file** - AI assistant context (v2.0) |
| `README.md` | Project overview |
| `.claude/PROJECT-CONTEXT.md` | Technical implementation details |
| `JSON-SCHEMA-VALIDATION.md` | Validation system documentation |

---

## 🎯 Development Notes

### For Claude Code AI Assistant

When continuing work:
1. **Architecture:** v2.0 uses AI-powered schema generation (not hardcoded)
2. **Validation:** Ajv JSON Schema (not quality scoring)
3. **AI Services:** GPT-4 Mini via API routes (not direct function calls)
4. **Format Support:** JSON and JSON Lines
5. **Database:** Validation columns (not quality score columns)

### Known Issues to Fix
1. **OpenRouter Endpoints** - Some models unavailable (need to verify endpoints)
2. **File Upload** - DOCX/PDF upload may need implementation check

---

## 📞 Context Summary

**What is this?** Swedish document extraction with AI-powered prompt optimization and JSON Schema validation.

**What's new in v2.0?** AI generates prompts and schemas automatically based on user's plain language description.

**What works?** AI optimization, schema generation, dynamic prompts, validation, multi-model comparison.

**What's next?** Fix OpenRouter endpoints, verify DOCX/PDF upload.

---

**End of Claude Context Document (v2.0)**
