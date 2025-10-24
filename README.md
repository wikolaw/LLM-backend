# LLM Document Analysis

A web-based demo application that extracts structured data from documents (PDF, DOCX, TXT) using multiple LLM models via OpenRouter.

## Project Status: ✅ COMPLETE

### ✅ Fully Implemented

1. **Supabase Infrastructure**
   - Project created: `ughfpgtntupnedjotmrr`
   - Database schema: `documents`, `runs`, `outputs`, `models` tables
   - Row Level Security (RLS) policies configured
   - Storage bucket for documents created
   - **16 LLM models configured** (including free tier options)

2. **Document Extraction** (Production-Ready)
   - **Vercel API Route** (`/api/extract-text`): Extracts text from TXT, DOCX, PDF
   - Uses Node.js libraries: `mammoth` (DOCX), `pdfjs-dist` (PDF)
   - Performance: 576ms (TXT), 11.1s (DOCX)

3. **Supabase Edge Functions** (Deployed & Active)
   - `run-llm-inference`: Runs multiple LLM models in parallel via OpenRouter
   - `calculate-consensus`: Cross-model validation and quality scoring

4. **Next.js Application** (Complete)
   - ✅ Landing page with features overview
   - ✅ Authentication system (magic link + GitHub OAuth)
   - ✅ Document upload with drag-and-drop
   - ✅ Prompt editor (generic & Swedish contract schemas)
   - ✅ Multi-model selection UI with cost estimation
   - ✅ Results comparison view with JSON export
   - ✅ Full dashboard workflow integration

### 🎯 Ready to Use

All components are integrated and ready for testing!

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── upload/            # Document upload components
│   ├── prompt/            # Prompt editor
│   ├── results/           # Results display
│   └── ui/                # Reusable UI components
├── lib/
│   ├── extraction/        # Document parsing (TXT, DOCX, PDF)
│   ├── supabase/          # Supabase client utilities
│   ├── openrouter/        # OpenRouter API client
│   ├── validation/        # Quality scoring system
│   └── schemas/           # Zod schemas and JSON schemas
├── app/api/
│   └── extract-text/      # Vercel API route for document extraction
├── supabase/
│   └── functions/         # Edge Functions
│       ├── run-llm-inference/
│       └── calculate-consensus/
└── middleware.ts          # Supabase auth middleware
```

## Required Credentials

### 1. Supabase (Already Configured)
- **Project URL**: `https://ughfpgtntupnedjotmrr.supabase.co`
- **Anon Key**: Already in `.env.local`
- **Service Role Key**: **REQUIRED** - Get from Supabase Dashboard → Settings → API

### 2. OpenRouter (REQUIRED)
- **API Key**: Get from [OpenRouter.ai](https://openrouter.ai/keys)
- Add to `.env.local` as `OPENROUTER_API_KEY`

###  3. Supabase Edge Function Environment Variables
You need to set the OpenRouter API key for the Edge Functions:
```bash
supabase secrets set OPENROUTER_API_KEY=your_key_here --project-ref ughfpgtntupnedjotmrr
```

## Environment Variables

Update `.env.local`:

```env
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://ughfpgtntupnedjotmrr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<already_set>
SUPABASE_SERVICE_ROLE_KEY=<get_from_dashboard>

# OpenRouter (REQUIRED)
OPENROUTER_API_KEY=<get_from_openrouter.ai>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Document Extraction Architecture

The document extraction system uses **Vercel API Routes with full Node.js runtime** to extract text from uploaded documents.

### Supported Formats

| Format | Library | Status | Performance |
|--------|---------|--------|-------------|
| TXT | Native Node.js | ✅ Production | ~500ms |
| DOCX/DOC | mammoth | ✅ Production | ~11s |
| PDF | pdfjs-dist | ✅ Production | ~1-5s |

### How It Works

```
User uploads file → Supabase Storage
    ↓
Client calls /api/extract-text → Vercel API Route (Node.js)
    ↓
API downloads file → Extracts text → Updates DB
    ↓
Returns success with character count and excerpt
```

### Key Files

- `lib/extraction/document-parser.ts` - Core extraction library
- `app/api/extract-text/route.ts` - Vercel API endpoint
- `components/upload/DocumentUpload.tsx` - Frontend upload UI

### Documentation

For detailed implementation details, see:
- **[Document Extraction Solution](Documentation/DOCUMENT-EXTRACTION-SOLUTION.md)** - Complete architecture and API documentation
- **[PDF Extraction Investigation](Documentation/PDF-EXTRACTION-INVESTIGATION.md)** - Library comparison and research
- **[Test Results](Documentation/TEST-RESULTS-DOCUMENT-EXTRACTION.md)** - Validation and performance analysis

---

## Schema Types

### Generic Document Extraction
Extracts: entities, dates, amounts, summary, language, document type, topics

### Swedish Contract Extraction (Railway Infrastructure)
Optimized for "entreprenadkontrakt för drift och underhåll av järnvägsinfrastruktur"

Extracts:
- Allmän info (contract name, type, dates, description)
- Parter (beställare, entreprenör)
- Ekonomi (årlig ersättning, indexjustering)
- Infrastruktur (spårlängd, växlar, tekniska system)
- Ansvar (responsibilities, regulations)
- Kvalitet & säkerhet (certifications, requirements)
- Ändringar (change management)
- Bilagor (appendices)

## Available Models

| Provider | Model | Context | JSON Mode | Price (in/out per 1M tokens) |
|----------|-------|---------|-----------|------------------------------|
| Anthropic | Claude 3.5 Sonnet | 200K | ✅ | $3 / $15 |
| Anthropic | Claude 3 Opus | 200K | ✅ | $15 / $75 |
| OpenAI | GPT-4 Turbo | 128K | ✅ | $10 / $30 |
| OpenAI | GPT-3.5 Turbo | 16K | ✅ | $0.50 / $1.50 |
| Google | Gemini Pro | 32K | ✅ | $0.13 / $0.38 |
| Google | Gemini 1.5 Pro | 1M | ✅ | $3.50 / $10.50 |
| Meta | Llama 3 70B | 8K | ❌ | $0.59 / $0.79 |
| Mistral | Mixtral 8x7B | 32K | ❌ | $0.24 / $0.24 |
| Mistral | Mistral Medium | 32K | ✅ | $2.70 / $8.10 |

## Getting Started

1. **Install Supabase CLI** (if not already):
   ```bash
   npm install -g supabase
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Get Service Role Key**:
   - Go to https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/settings/api
   - Copy the `service_role` key
   - Add to `.env.local`

4. **Get OpenRouter API Key**:
   - Sign up at https://openrouter.ai
   - Create API key at https://openrouter.ai/keys
   - Add to `.env.local`

5. **Set Edge Function Secrets**:
   ```bash
   npx supabase secrets set OPENROUTER_API_KEY=your_key_here --project-ref ughfpgtntupnedjotmrr
   ```

6. **Run Development Server**:
   ```bash
   npm run dev
   ```

7. **Open Browser**:
   Visit http://localhost:3000

## Sample Documents

Sample documents for testing are located in:
- `Sample documents/` folder
- `Sample documents/sample user prompt.md` - Swedish contract extraction prompt

## Next Steps

1. Get required API keys (Service Role + OpenRouter)
2. Set environment variables
3. Complete dashboard UI
4. Test with sample documents
5. Deploy to Vercel

## Support

For issues or questions:
- Supabase Docs: https://supabase.com/docs
- OpenRouter Docs: https://openrouter.ai/docs
- Next.js Docs: https://nextjs.org/docs

## License

MIT
