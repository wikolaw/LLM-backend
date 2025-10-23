# Project Technical Context

**For Claude Code AI Assistant**

This document provides detailed technical context for continuing development on the LLM-backend project.

---

## 🏗️ Technical Architecture

### System Flow

```
1. User uploads document (PDF/TXT)
   ↓
2. Frontend: DocumentUpload component
   ↓
3. Text extraction (local or Edge Function)
   ↓
4. User selects schema + models
   ↓
5. Frontend calls: run-llm-inference Edge Function
   ↓
6. Edge Function:
   - For each selected model:
     - Call OpenRouter API
     - Parse response
     - Calculate 4 quality dimensions
     - Store in database
   ↓
7. (Optional) Call: calculate-consensus Edge Function
   - Cross-model validation
   - Calculate consensus score (5th dimension)
   - Update database
   ↓
8. Frontend displays results with quality scores
```

### Database Schema

**`runs` table:**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
document_id UUID REFERENCES documents
schema_id TEXT
system_prompt TEXT
created_at TIMESTAMP
```

**`outputs` table:**
```sql
id UUID PRIMARY KEY
run_id UUID REFERENCES runs
model TEXT
raw_output TEXT
parsed_output JSONB
json_valid BOOLEAN
error_message TEXT

-- Quality Score Columns (Added 2025-10-23)
quality_syntax INTEGER          -- 0-100 (JSON validity)
quality_structural INTEGER       -- 0-100 (object structure)
quality_completeness INTEGER     -- 0-100 (field coverage)
quality_content INTEGER          -- 0-100 (data quality)
quality_consensus INTEGER        -- 0-100 (cross-model agreement)
quality_overall INTEGER          -- Weighted average
quality_flags JSONB              -- Detailed issues
quality_metrics JSONB            -- Raw metrics

-- Performance Metrics
execution_time_ms INTEGER
tokens_in INTEGER
tokens_out INTEGER
cost_in DECIMAL
cost_out DECIMAL
created_at TIMESTAMP

-- Indexes
CREATE INDEX idx_outputs_run_id ON outputs(run_id);
CREATE INDEX idx_outputs_quality_overall ON outputs(quality_overall DESC NULLS LAST);
```

**`documents` table:**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
filename TEXT
file_path TEXT (Supabase Storage)
extracted_text TEXT
created_at TIMESTAMP
```

---

## 🔍 Quality Scoring Implementation

### Location: `supabase/functions/_shared/quality-scorer.ts`

This is the core algorithm. It's duplicated in:
1. `supabase/functions/_shared/quality-scorer.ts` (Deno - for Edge Functions)
2. `lib/validation/quality-scorer.ts` (Node.js - for local testing)

### Algorithm Details

#### 1. Syntax Quality (25% weight)

```typescript
function calculateSyntaxQuality(parsed: any, raw: string): SyntaxScore {
  let score = 100
  const issues: string[] = []

  // Check for markdown code blocks
  if (raw.includes('```')) {
    score -= 20
    issues.push('Contains markdown code blocks')
  }

  // Check for extra text before/after JSON
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    score -= 15
    issues.push('Extra text before JSON')
  }
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    score -= 15
    issues.push('Extra text after JSON')
  }

  // Check data types (numbers should be numbers, not strings)
  const stringifiedNumbers = countStringifiedNumbers(parsed)
  if (stringifiedNumbers > 0) {
    score -= Math.min(20, stringifiedNumbers * 5)
    issues.push(`${stringifiedNumbers} numbers stored as strings`)
  }

  return { score: Math.max(0, score), issues }
}
```

**Why this matters:** LLMs often add markdown formatting or explanatory text. Perfect JSON (100/100) means the model followed instructions exactly.

#### 2. Structural Quality (20% weight)

```typescript
function calculateStructuralQuality(parsed: any): StructuralScore {
  let score = 100
  const issues: string[] = []

  // Must be an object at top level
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { score: 0, issues: ['Not an object at top level'] }
  }

  // Analyze nesting depth
  const maxDepth = getMaxDepth(parsed)
  const avgDepth = getAvgDepth(parsed)

  // Ideal depth: 2-4 levels
  if (maxDepth < 2) {
    score -= 20
    issues.push('Too shallow (lacks nested structure)')
  } else if (maxDepth > 6) {
    score -= 15
    issues.push('Too deep (overly nested)')
  }

  // Check depth consistency
  const depthVariance = calculateDepthVariance(parsed)
  if (depthVariance > 2) {
    score -= 10
    issues.push('Inconsistent nesting depth')
  }

  return { score: Math.max(0, score), issues }
}
```

**Why this matters:** Good structure means proper use of nested objects vs flat primitives.

#### 3. Completeness (20% weight)

```typescript
function calculateCompleteness(parsed: any): CompletenessScore {
  let score = 100
  const issues: string[] = []

  const stats = analyzeObject(parsed)

  // Top-level fields (expect 5-15)
  if (stats.topLevelFields < 3) {
    score -= 30
    issues.push('Too few top-level fields')
  } else if (stats.topLevelFields > 20) {
    score -= 10
    issues.push('Too many top-level fields (may be disorganized)')
  }

  // Non-null ratio (expect >70%)
  const nonNullRatio = stats.nonNullCount / stats.totalFields
  if (nonNullRatio < 0.5) {
    score -= 20
    issues.push('Many null/undefined values')
  } else if (nonNullRatio < 0.7) {
    score -= 10
    issues.push('Some null/undefined values')
  }

  // Empty arrays (penalize)
  if (stats.emptyArrays > 0) {
    score -= Math.min(15, stats.emptyArrays * 5)
    issues.push(`${stats.emptyArrays} empty arrays`)
  }

  return { score: Math.max(0, score), issues, metrics: stats }
}
```

**Why this matters:** More fields = more extracted information = better completeness.

#### 4. Content Quality (20% weight)

```typescript
function calculateContentQuality(parsed: any): ContentScore {
  let score = 100
  const issues: string[] = []

  // Date format consistency (expect ISO 8601: YYYY-MM-DD)
  const dates = extractDates(parsed)
  const invalidDates = dates.filter(d => !isISOFormat(d))
  if (invalidDates.length > 0) {
    score -= Math.min(20, invalidDates.length * 5)
    issues.push(`${invalidDates.length} dates not in ISO 8601 format`)
  }

  // Numeric values (check for reasonableness)
  const numbers = extractNumbers(parsed)
  const unreasonableNumbers = numbers.filter(n =>
    isNaN(n) || !isFinite(n) || n < -1e10 || n > 1e10
  )
  if (unreasonableNumbers.length > 0) {
    score -= Math.min(15, unreasonableNumbers.length * 5)
    issues.push(`${unreasonableNumbers.length} unreasonable numbers`)
  }

  // Empty strings (penalize)
  const emptyStrings = countEmptyStrings(parsed)
  if (emptyStrings > 0) {
    score -= Math.min(20, emptyStrings * 3)
    issues.push(`${emptyStrings} empty string values`)
  }

  return { score: Math.max(0, score), issues }
}
```

**Why this matters:** Ensures data is in the correct format and usable.

#### 5. Consensus Score (15% weight)

Location: `supabase/functions/_shared/consensus-analyzer.ts`

```typescript
function calculateConsensusScore(
  output: Output,
  allOutputs: Output[]
): ConsensusScore {
  if (allOutputs.length < 2) {
    return { score: 0, reason: 'Need 2+ models for consensus' }
  }

  let score = 100
  const issues: string[] = []

  // Field name agreement
  const myFields = extractFieldPaths(output.parsed_output)
  const otherOutputs = allOutputs.filter(o => o.id !== output.id && o.json_valid)

  let fieldAgreementScore = 0
  for (const other of otherOutputs) {
    const otherFields = extractFieldPaths(other.parsed_output)
    const agreement = calculateFieldAgreement(myFields, otherFields)
    fieldAgreementScore += agreement
  }
  fieldAgreementScore /= otherOutputs.length

  if (fieldAgreementScore < 0.5) {
    score -= 30
    issues.push('Low field agreement with other models')
  }

  // Value agreement (for matching fields)
  let valueAgreementScore = 0
  for (const other of otherOutputs) {
    const agreement = calculateValueAgreement(
      output.parsed_output,
      other.parsed_output
    )
    valueAgreementScore += agreement
  }
  valueAgreementScore /= otherOutputs.length

  if (valueAgreementScore < 0.6) {
    score -= 20
    issues.push('Low value agreement with other models')
  }

  return {
    score: Math.max(0, score),
    issues,
    fieldAgreement: fieldAgreementScore,
    valueAgreement: valueAgreementScore
  }
}
```

**Why this matters:** If multiple models extract the same fields/values, it's likely correct.

### Overall Quality Score

```typescript
function calculateOverallScore(scores: QualityScores): number {
  const weights = {
    syntax: 0.25,
    structural: 0.20,
    completeness: 0.20,
    content: 0.20,
    consensus: 0.15
  }

  return Math.round(
    scores.syntax * weights.syntax +
    scores.structural * weights.structural +
    scores.completeness * weights.completeness +
    scores.content * weights.content +
    (scores.consensus || 0) * weights.consensus
  )
}
```

---

## 🚀 Edge Function Details

### `run-llm-inference` (v3)

**File:** `supabase/functions/run-llm-inference/index.ts`

**Purpose:** Main inference function that calls OpenRouter and calculates quality scores.

**Flow:**
1. Receive request: `{ runId, model, systemPrompt, documentText }`
2. Call OpenRouter API
3. Parse response
4. Calculate 4 quality dimensions (syntax, structural, completeness, content)
5. Calculate overall score (weighted average, consensus=0 initially)
6. Store in `outputs` table
7. Return result

**Key Code:**
```typescript
// Call OpenRouter
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: documentText }
    ]
  })
})

const data = await response.json()
const rawOutput = data.choices[0].message.content

// Parse and calculate quality
let parsedOutput = null
let jsonValid = false
let qualityScores = null

try {
  parsedOutput = JSON.parse(rawOutput)
  jsonValid = true

  // Calculate quality scores
  qualityScores = calculateQualityScores(parsedOutput, rawOutput)
} catch (e) {
  jsonValid = false
  qualityScores = {
    syntax: 0,
    structural: 0,
    completeness: 0,
    content: 0,
    consensus: 0,
    overall: 0
  }
}

// Store in database
await supabase.from('outputs').insert({
  run_id: runId,
  model: model,
  raw_output: rawOutput,
  parsed_output: parsedOutput,
  json_valid: jsonValid,
  quality_syntax: qualityScores.syntax,
  quality_structural: qualityScores.structural,
  quality_completeness: qualityScores.completeness,
  quality_content: qualityScores.content,
  quality_consensus: 0, // Calculated later by calculate-consensus
  quality_overall: qualityScores.overall,
  quality_flags: qualityScores.flags,
  quality_metrics: qualityScores.metrics,
  execution_time_ms: data.usage?.total_time,
  tokens_in: data.usage?.prompt_tokens,
  tokens_out: data.usage?.completion_tokens
})
```

### `calculate-consensus` (v1)

**File:** `supabase/functions/calculate-consensus/index.ts`

**Purpose:** Cross-model validation and consensus scoring.

**Flow:**
1. Receive request: `{ runId }`
2. Fetch all outputs for the run
3. Filter for valid JSON outputs
4. For each output:
   - Calculate consensus score vs other outputs
   - Update `quality_consensus` in database
   - Recalculate `quality_overall` with consensus included
5. Generate consensus analysis report:
   - Field agreement (which fields all models agree on)
   - Value agreement (which values all models agree on)
   - Best model recommendation
   - Quality-based ranking
6. Return analysis

**Key Code:**
```typescript
// Fetch all outputs for run
const { data: outputs } = await supabase
  .from('outputs')
  .select('*')
  .eq('run_id', runId)
  .eq('json_valid', true)

if (outputs.length < 2) {
  return { error: 'Need 2+ successful models for consensus' }
}

// Calculate consensus for each output
for (const output of outputs) {
  const consensusScore = calculateConsensusScore(output, outputs)

  // Update database
  const newOverall = calculateOverallScore({
    syntax: output.quality_syntax,
    structural: output.quality_structural,
    completeness: output.quality_completeness,
    content: output.quality_content,
    consensus: consensusScore.score
  })

  await supabase
    .from('outputs')
    .update({
      quality_consensus: consensusScore.score,
      quality_overall: newOverall
    })
    .eq('id', output.id)
}

// Generate analysis
const analysis = {
  fieldConsensus: calculateFieldConsensus(outputs),
  valueConsensus: calculateValueConsensus(outputs),
  recommendations: {
    bestModel: outputs.sort((a, b) => b.quality_overall - a.quality_overall)[0],
    modelRankings: outputs.sort((a, b) => b.quality_overall - a.quality_overall)
  }
}

return { consensusAnalysis: analysis }
```

---

## 📝 System Prompt Engineering

**Location:** `lib/schemas/extraction.ts`

The system prompt is critical for quality. We improved from Swedish to English with explicit requirements:

### Before (Swedish, 11% success):
```
Du är en AI-assistent som extraherar information från svenska dokument.
Returnera resultatet som JSON.
```

### After (English, explicit, 100% syntax achieved):
```typescript
export const SWEDISH_RAILWAY_CONTRACT_PROMPT = `You are a specialized data extraction assistant for Swedish railway infrastructure contracts.

CRITICAL INSTRUCTIONS:
1. Your response must contain ONLY valid JSON - nothing else
2. Do NOT include markdown code blocks (no \`\`\`json)
3. Do NOT include any explanatory text before or after the JSON
4. Do NOT use markdown formatting

OUTPUT FORMAT:
- Return a single JSON object
- Use exact field names from the schema
- Use YYYY-MM-DD format for all dates (ISO 8601)
- Store numbers as numbers, not strings
- Use null for missing information (do not use empty strings)
- Ensure all JSON is valid and parseable

EXTRACTION SCHEMA:
{
  "contract_name": "string",
  "contract_number": "string",
  "contracting_authority": {
    "name": "string",
    "organization_number": "string",
    "contact_person": "string"
  },
  "contractor": {
    "name": "string",
    "organization_number": "string",
    "contact_person": "string"
  },
  "contract_period": {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "duration_months": number
  },
  "contract_value": {
    "total_amount": number,
    "currency": "SEK",
    "payment_terms": "string"
  },
  "railway_lines": ["string"],
  "scope_of_work": {
    "maintenance_types": ["string"],
    "responsibilities": ["string"]
  }
}

QUALITY REQUIREMENTS:
- Accuracy is more important than speed
- If information is not found, use null
- Maintain consistent date formatting (YYYY-MM-DD)
- Ensure all numbers are numeric types
- Use proper nested structure

Extract the information from the provided Swedish document and return ONLY the JSON object.`
```

**Key improvements:**
1. ✅ **Language:** English (better model comprehension)
2. ✅ **Explicit:** "Your response must contain ONLY valid JSON"
3. ✅ **Prohibited:** "Do NOT include markdown code blocks"
4. ✅ **Format:** "YYYY-MM-DD for dates", "numbers as numbers"
5. ✅ **Quality:** "Accuracy is more important than speed"

**Result:** Mixtral 8x7B achieved 100/100 syntax score (perfect).

---

## 🧪 Testing Infrastructure

### E2E Test: `tests/quality-scoring.spec.ts`

**Purpose:** Full workflow test from login to results validation.

**Flow:**
1. Login with test user
2. Upload test document
3. Verify enhanced system prompt in UI
4. Select 9 models
5. Click "Run X Models"
6. Wait for completion (1-2 minutes)
7. Fetch results from database
8. Validate quality scores exist and are in range (0-100)
9. Generate detailed report
10. Take screenshot

**Key assertion:**
```typescript
// Validate quality scores exist
const validOutputs = outputs.filter(o => o.json_valid)
expect(validOutputs.length).toBeGreaterThan(0)

// Validate quality scores in range
for (const output of validOutputs) {
  expect(output.quality_syntax).toBeGreaterThanOrEqual(0)
  expect(output.quality_syntax).toBeLessThanOrEqual(100)
  expect(output.quality_overall).toBeGreaterThanOrEqual(0)
  expect(output.quality_overall).toBeLessThanOrEqual(100)
}
```

### API Test: `tests/quality-scoring-api.spec.ts`

**Purpose:** Quick validation of latest database run.

**Flow:**
1. Fetch latest run from database
2. Fetch all outputs for that run
3. Validate quality scores exist
4. Call calculate-consensus endpoint
5. Validate consensus analysis

**Advantage:** Fast (no browser, no inference), good for CI/CD.

---

## 🔐 Authentication & Permissions

### Test User

- **Email:** `test@playwright.local`
- **Password:** `TestPassword123!`
- **Purpose:** Automated testing
- **Created:** Via Supabase Auth dashboard

### Row Level Security (RLS)

**Enabled on all tables:**
- Users can only see their own data
- Enforced at database level
- Edge Functions use service role (bypass RLS)

**Example policy:**
```sql
CREATE POLICY "Users can view their own runs"
ON runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own runs"
ON runs FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## 🐛 Known Issues & Workarounds

### Issue 1: Supabase MCP - Shared Files

**Problem:** `mcp__supabase__deploy_edge_function` doesn't include `_shared/` files.

**Error:**
```
Module not found "file:///tmp/.../source/supabase/functions/_shared/cors.ts"
```

**Workaround:** Use Supabase CLI instead:
```bash
export SUPABASE_ACCESS_TOKEN=sbp_8492609bfa82d170d97716348b7719a55a28c62f
npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
```

### Issue 2: Deno Import Extensions

**Problem:** Deno requires explicit `.ts` extensions in imports.

**Error:**
```
Module not found "file:///.../quality-scorer"
```

**Fix:** Add `.ts` extension:
```typescript
// Before (fails in Deno)
import { QualityScores } from './quality-scorer';

// After (works in Deno)
import { QualityScores } from './quality-scorer.ts';
```

### Issue 3: Model Availability

**Problem:** Many "free" models on OpenRouter are no longer available.

**Models that failed:**
- Google Gemini Pro - "not a valid model ID"
- Llama 3.1 8B (Free) - "No endpoints found"
- Llama 2 13B Chat - "No endpoints found"
- Llama 3 8B (Free) - "No endpoints found"

**Solution:** Use confirmed available models:
- Mixtral 8x7B ✅ (tested, works)
- Mixtral 8x22B ✅ (free, large, recommended)
- Llama 3.1 70B ✅ (free, recommended)
- Qwen 2.5 72B ✅ (free, recommended)

### Issue 4: Small Models Can't Produce Valid JSON

**Problem:** 7B-8B models often fail to maintain JSON structure for complex tasks.

**Evidence:**
- Mistral 7B: Only 1 token generated
- Llama 3.1 8B: Generated 1,360 tokens but invalid JSON

**Solution:** Use models ≥70B parameters for complex extraction.

---

## 📊 Performance Benchmarks

### Mixtral 8x7B (Successful)

- **Execution Time:** 364ms
- **Tokens In:** 3,031
- **Tokens Out:** 587
- **Cost:** $0.00006
- **Quality Overall:** 70/100
  - Syntax: 100/100 ⭐
  - Structural: 66/100
  - Completeness: 72/100
  - Content: 85/100
  - Consensus: 0/100 (not calculated)

### Expected: Claude 3.5 Sonnet

- **Execution Time:** ~500-800ms (estimate)
- **Tokens:** Similar to Mixtral
- **Cost:** $0.003-0.005 per extraction
- **Quality Expected:** 90-95/100

### Expected: GPT-4

- **Execution Time:** ~600-1000ms (estimate)
- **Tokens:** Similar to Mixtral
- **Cost:** $0.002-0.004 per extraction
- **Quality Expected:** 90-95/100

---

## 🚀 Deployment Checklist

Before deploying changes:

- [ ] Test locally: `npm run dev`
- [ ] Run E2E tests: `npx playwright test`
- [ ] Check database migration needed?
- [ ] Deploy Edge Functions if changed:
  ```bash
  export SUPABASE_ACCESS_TOKEN=sbp_8492609bfa82d170d97716348b7719a55a28c62f
  npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
  npx supabase functions deploy calculate-consensus --project-ref ughfpgtntupnedjotmrr
  ```
- [ ] Test in production with test user
- [ ] Verify quality scores in database
- [ ] Update documentation if needed
- [ ] Commit and push to GitHub

---

## 📞 Questions to Ask When Debugging

1. **Is the Edge Function deployed?**
   ```bash
   npx supabase functions list --project-ref ughfpgtntupnedjotmrr
   ```

2. **Is the database migration applied?**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'outputs' AND column_name LIKE 'quality%';
   ```
   Should return 8 columns.

3. **Is the system prompt being used correctly?**
   Check UI shows English prompt with "Your response must contain ONLY valid JSON".

4. **Are quality scores being calculated?**
   ```sql
   SELECT quality_syntax, quality_overall FROM outputs
   WHERE json_valid = true
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   Should show non-null values.

5. **Which models are actually available?**
   Check OpenRouter docs: https://openrouter.ai/models
   Filter by "Free" and check "Available" status.

---

**End of Technical Context**

For high-level overview, see: `CLAUDE.md`
For development workflow, see: `.claude/DEVELOPMENT-GUIDE.md`
