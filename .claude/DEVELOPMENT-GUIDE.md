# Development Guide

**Best Practices for Continuing Work on LLM-backend**

---

## 🎯 Quick Start Workflow

### For First-Time Setup

1. **Read Documentation:**
   - Start with `CLAUDE.md` (project overview)
   - Then `.claude/PROJECT-CONTEXT.md` (technical details)
   - Finally this file (development workflow)

2. **Set Up Environment:**
   ```bash
   npm install
   cp .env.example .env.local
   # Add API keys to .env.local
   npm run dev
   ```

3. **Test Login:**
   - Go to http://localhost:3000
   - Login: `test@playwright.local` / `TestPassword123!`

4. **Run a Test:**
   ```bash
   npx playwright test quality-scoring-api.spec.ts
   ```

5. **You're ready!**

---

## 🔄 Development Workflows

### Workflow 1: Testing Premium Models (Next Priority)

**Goal:** Validate target 60-80% success rate with larger models.

**Steps:**

1. **Prepare test run:**
   ```bash
   # Start dev server if not running
   npm run dev
   ```

2. **Access application:**
   - Open http://localhost:3000
   - Login with test user

3. **Configure test:**
   - Upload: `Sample documents/test-contract-arlanda.txt`
   - Schema: "Swedish Contract (Railway)"
   - **Select premium models:**
     - ✅ Claude 3.5 Sonnet
     - ✅ GPT-4
     - ✅ Mixtral 8x22B (free)
     - ✅ Llama 3.1 70B (free)
     - ✅ Qwen 2.5 72B (free)

4. **Run and wait:**
   - Click "Run 5 Models"
   - Wait 1-2 minutes

5. **Analyze results:**
   ```bash
   # Run API validation test to see results
   npx playwright test quality-scoring-api.spec.ts
   ```

6. **Expected outcome:**
   - 4-5/5 models succeed (80-100%)
   - Quality scores: 80-95/100
   - Validates system is production-ready

7. **Document findings:**
   - Update `QUALITY-SCORING-TEST-RESULTS.md`
   - Add new section: "Premium Model Test Results"
   - Include model-by-model breakdown

### Workflow 2: Frontend Integration

**Goal:** Display quality scores in UI.

**Prerequisites:**
- Premium model test completed
- Success rate ≥60%

**Steps:**

1. **Update ResultsComparison component:**
   ```typescript
   // components/results/ResultsComparison.tsx

   interface Output {
     model: string
     json_valid: boolean
     quality_overall: number  // Add this
     quality_syntax: number    // Add this
     quality_structural: number
     quality_completeness: number
     quality_content: number
     quality_consensus: number
   }

   // Add quality score display
   {output.json_valid && (
     <div className="quality-scores">
       <div className="overall-score">
         Overall: {output.quality_overall}/100
       </div>
       <div className="dimension-scores">
         <span>Syntax: {output.quality_syntax}</span>
         <span>Structural: {output.quality_structural}</span>
         <span>Complete: {output.quality_completeness}</span>
         <span>Content: {output.quality_content}</span>
         <span>Consensus: {output.quality_consensus || 0}</span>
       </div>
     </div>
   )}
   ```

2. **Add quality-based sorting:**
   ```typescript
   const sortedOutputs = outputs.sort((a, b) =>
     (b.quality_overall || 0) - (a.quality_overall || 0)
   )
   ```

3. **Highlight best model:**
   ```typescript
   {index === 0 && output.json_valid && (
     <div className="best-model-badge">
       ⭐ Best Quality
     </div>
   )}
   ```

4. **Test:**
   ```bash
   npm run dev
   # Upload document, run models, verify quality scores display
   ```

5. **Write E2E test:**
   ```typescript
   test('displays quality scores in UI', async ({ page }) => {
     // ... login, upload, configure ...

     await page.click('button:has-text("Run")')
     await page.waitForSelector('.quality-scores')

     const overallScore = await page.textContent('.overall-score')
     expect(overallScore).toContain('/100')
   })
   ```

### Workflow 3: Adding a New Model

**Goal:** Add a new LLM to model selection.

**Steps:**

1. **Check model availability:**
   - Go to https://openrouter.ai/models
   - Find model ID (e.g., `anthropic/claude-3.5-sonnet`)
   - Check pricing and availability

2. **Add to ModelSelector:**
   ```typescript
   // components/results/ModelSelector.tsx

   const MODELS = [
     // ... existing models ...
     {
       id: 'anthropic/claude-3.5-sonnet',
       name: 'Claude 3.5 Sonnet',
       provider: 'Anthropic',
       free: false,
       pricing: '$3 per 1M tokens',
       recommended: true, // Large model, high quality
       minSize: '200B'
     }
   ]
   ```

3. **Test:**
   ```bash
   npm run dev
   # Select new model, run inference, verify it works
   ```

4. **Document:**
   - Update `README.md` with new model
   - Update test results if tested

### Workflow 4: Modifying Quality Scoring

**Goal:** Adjust quality scoring weights or add new dimension.

**Files to modify:**
1. `supabase/functions/_shared/quality-scorer.ts` (Deno - Edge Function)
2. `lib/validation/quality-scorer.ts` (Node.js - local testing)

**Important:** Keep both files in sync!

**Example: Adjust weights:**

```typescript
// Before
const weights = {
  syntax: 0.25,
  structural: 0.20,
  completeness: 0.20,
  content: 0.20,
  consensus: 0.15
}

// After (prioritize syntax more)
const weights = {
  syntax: 0.35,      // +10%
  structural: 0.15,  // -5%
  completeness: 0.15, // -5%
  content: 0.20,
  consensus: 0.15
}
```

**Steps:**

1. **Modify both files:**
   - `supabase/functions/_shared/quality-scorer.ts`
   - `lib/validation/quality-scorer.ts`

2. **Deploy Edge Function:**
   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_8492609bfa82d170d97716348b7719a55a28c62f
   npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
   ```

3. **Test:**
   ```bash
   npx playwright test quality-scoring-api.spec.ts
   ```

4. **Compare before/after:**
   - Run test with old weights
   - Run test with new weights
   - Compare overall scores
   - Document decision

### Workflow 5: Database Changes

**Goal:** Add new column or modify schema.

**Steps:**

1. **Create migration:**
   ```bash
   npx supabase migration new add_quality_confidence
   ```

2. **Write SQL:**
   ```sql
   -- supabase/migrations/TIMESTAMP_add_quality_confidence.sql

   ALTER TABLE outputs
   ADD COLUMN quality_confidence INTEGER;

   CREATE INDEX idx_outputs_quality_confidence
   ON outputs(quality_confidence DESC NULLS LAST);
   ```

3. **Apply migration:**
   ```bash
   npx supabase db push --project-ref ughfpgtntupnedjotmrr
   ```

4. **Update TypeScript types:**
   ```typescript
   // lib/supabase/types.ts

   export interface Output {
     // ... existing fields ...
     quality_confidence: number | null
   }
   ```

5. **Update Edge Function:**
   ```typescript
   // supabase/functions/run-llm-inference/index.ts

   await supabase.from('outputs').insert({
     // ... existing fields ...
     quality_confidence: calculateConfidence(parsedOutput)
   })
   ```

6. **Deploy and test:**
   ```bash
   npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
   npx playwright test quality-scoring-api.spec.ts
   ```

---

## 🧪 Testing Best Practices

### When to Write Tests

**Always write tests for:**
1. New quality scoring dimensions
2. New model integrations
3. Database schema changes
4. System prompt modifications
5. UI changes that affect results display

**Test types:**
1. **Unit tests** - Individual functions
2. **Integration tests** - API/database interactions
3. **E2E tests** - Full workflow with browser

### Running Tests

```bash
# All tests
npx playwright test

# Specific test file
npx playwright test quality-scoring.spec.ts

# With browser (headed mode)
npx playwright test quality-scoring.spec.ts --headed

# Debug mode
npx playwright test quality-scoring.spec.ts --debug

# Quick API validation (no browser)
npx playwright test quality-scoring-api.spec.ts
```

### Test Data

**Always use:**
- Document: `Sample documents/test-contract-arlanda.txt`
- Schema: "Swedish Contract (Railway)"
- Test user: `test@playwright.local` / `TestPassword123!`

**Why:** Consistent test data makes results comparable across runs.

---

## 📝 Documentation Standards

### When to Update Documentation

**Update immediately when:**
1. Adding new features
2. Changing system prompts
3. Modifying quality scoring
4. Deploying new Edge Functions
5. Changing database schema

### Files to Update

| Change Type | Files to Update |
|-------------|-----------------|
| New feature | `README.md`, `CLAUDE.md` |
| Quality scoring | `QUALITY-SCORING-IMPLEMENTATION.md`, `.claude/PROJECT-CONTEXT.md` |
| Test results | `QUALITY-SCORING-TEST-RESULTS.md` |
| Deployment | `QUALITY-SCORING-DEPLOYMENT-SUMMARY.md` |
| System prompt | `lib/schemas/extraction.ts` (inline docs) |

### Documentation Format

Use clear sections:
1. **What changed**
2. **Why it changed**
3. **How to use it**
4. **Test results**

---

## 🚀 Deployment Process

### Edge Function Deployment

**Every time you modify:**
- `supabase/functions/run-llm-inference/`
- `supabase/functions/calculate-consensus/`
- `supabase/functions/_shared/`

**Deploy:**
```bash
# Set token (do once per session)
export SUPABASE_ACCESS_TOKEN=sbp_8492609bfa82d170d97716348b7719a55a28c62f

# Deploy specific function
npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr

# Deploy all functions
npx supabase functions deploy --project-ref ughfpgtntupnedjotmrr

# Verify deployment
npx supabase functions list --project-ref ughfpgtntupnedjotmrr
```

**Test after deployment:**
```bash
# Quick validation
npx playwright test quality-scoring-api.spec.ts

# Full E2E test
npx playwright test quality-scoring.spec.ts
```

### Database Migration

**Process:**
1. Create migration file
2. Write SQL
3. Apply with `db push`
4. Update TypeScript types
5. Update Edge Functions if needed
6. Deploy Edge Functions
7. Test

### Frontend Deployment

**Vercel (automatic):**
- Push to GitHub → Vercel deploys automatically
- Vercel detects Next.js, runs `npm run build`

**Manual:**
```bash
npm run build
# Upload .next/ to hosting
```

---

## 🐛 Debugging Workflows

### Issue: Edge Function Not Working

**Debug steps:**

1. **Check deployment:**
   ```bash
   npx supabase functions list --project-ref ughfpgtntupnedjotmrr
   ```

2. **Check logs:**
   ```bash
   npx supabase functions logs run-llm-inference --project-ref ughfpgtntupnedjotmrr
   ```

3. **Test directly:**
   ```bash
   curl -X POST https://ughfpgtntupnedjotmrr.supabase.co/functions/v1/run-llm-inference \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"runId": "test", "model": "mistralai/mixtral-8x7b-instruct"}'
   ```

4. **Check environment variables:**
   - Supabase dashboard → Edge Functions → Settings
   - Verify `OPENROUTER_API_KEY` is set

### Issue: Quality Scores Not Appearing

**Debug steps:**

1. **Check database:**
   ```sql
   SELECT quality_syntax, quality_overall
   FROM outputs
   WHERE json_valid = true
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Check Edge Function version:**
   ```bash
   npx supabase functions list --project-ref ughfpgtntupnedjotmrr
   ```
   Should show v3 for run-llm-inference.

3. **Re-deploy if needed:**
   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_8492609bfa82d170d97716348b7719a55a28c62f
   npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
   ```

4. **Run test:**
   ```bash
   npx playwright test quality-scoring-api.spec.ts
   ```

### Issue: Test Failing

**Debug steps:**

1. **Run with headed mode:**
   ```bash
   npx playwright test quality-scoring.spec.ts --headed
   ```

2. **Check screenshot:**
   ```bash
   # Screenshots saved to: test-results/
   open test-results/quality-scoring-*/test-failed-*.png
   ```

3. **Check error logs:**
   ```bash
   npx playwright test quality-scoring.spec.ts > test-output.log 2>&1
   cat test-output.log
   ```

4. **Debug interactively:**
   ```bash
   npx playwright test quality-scoring.spec.ts --debug
   ```

---

## 🎯 Code Style Guide

### TypeScript

```typescript
// ✅ Good: Type everything
interface QualityScores {
  syntax: number
  structural: number
  completeness: number
  content: number
  consensus: number
  overall: number
}

// ❌ Bad: No types
function calculate(scores) {
  return scores.syntax + scores.structural
}

// ✅ Good: Explicit return type
function calculateOverall(scores: QualityScores): number {
  return Math.round(scores.syntax * 0.25 + ...)
}
```

### React Components

```typescript
// ✅ Good: Functional components with TypeScript
interface Props {
  output: Output
  onSelect: (id: string) => void
}

export default function ResultCard({ output, onSelect }: Props) {
  return <div>...</div>
}

// ❌ Bad: No types
export default function ResultCard({ output, onSelect }) {
  return <div>...</div>
}
```

### Edge Functions (Deno)

```typescript
// ✅ Good: Explicit imports with .ts extension
import { QualityScores } from './quality-scorer.ts'
import { corsHeaders } from './cors.ts'

// ❌ Bad: No extension (fails in Deno)
import { QualityScores } from './quality-scorer'
```

### SQL

```sql
-- ✅ Good: Clear, commented, with indexes
-- Add quality scoring columns to outputs table
ALTER TABLE outputs
ADD COLUMN quality_syntax INTEGER,
ADD COLUMN quality_structural INTEGER;

-- Index for sorting by quality
CREATE INDEX idx_outputs_quality_overall
ON outputs(quality_overall DESC NULLS LAST);

-- ❌ Bad: No comments, no indexes
ALTER TABLE outputs ADD COLUMN quality_syntax INTEGER;
```

---

## 📊 Performance Optimization

### Database Queries

```typescript
// ✅ Good: Use select() with specific columns
const { data } = await supabase
  .from('outputs')
  .select('id, model, quality_overall')
  .eq('run_id', runId)
  .order('quality_overall', { ascending: false })

// ❌ Bad: Select all columns unnecessarily
const { data } = await supabase
  .from('outputs')
  .select('*')
  .eq('run_id', runId)
```

### Edge Functions

```typescript
// ✅ Good: Parallel execution
const promises = models.map(model =>
  callOpenRouter(model, prompt)
)
const results = await Promise.all(promises)

// ❌ Bad: Sequential execution
for (const model of models) {
  const result = await callOpenRouter(model, prompt)
  results.push(result)
}
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# ✅ Good: Never commit .env files
.env
.env.local
.env.production

# ✅ Good: Use .env.example for documentation
NEXT_PUBLIC_SUPABASE_URL=your_url_here
OPENROUTER_API_KEY=your_key_here
```

### API Keys

```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.OPENROUTER_API_KEY

// ❌ Bad: Hardcode keys
const apiKey = 'sk-or-v1-...'
```

### Database Access

```typescript
// ✅ Good: Use RLS policies
CREATE POLICY "users_own_runs"
ON runs FOR ALL
USING (auth.uid() = user_id);

// ✅ Good: Use service role only in Edge Functions
const supabase = createClient(url, serviceRoleKey)
```

---

## 🎓 Learning Resources

### Next.js
- Official docs: https://nextjs.org/docs
- App Router: https://nextjs.org/docs/app

### Supabase
- Official docs: https://supabase.com/docs
- Edge Functions: https://supabase.com/docs/guides/functions

### OpenRouter
- Model catalog: https://openrouter.ai/models
- API docs: https://openrouter.ai/docs

### Playwright
- Official docs: https://playwright.dev
- Best practices: https://playwright.dev/docs/best-practices

---

## 📞 Getting Help

### Check These First

1. **`CLAUDE.md`** - Project overview and context
2. **`.claude/PROJECT-CONTEXT.md`** - Technical details
3. **This file** - Development workflows
4. **`QUALITY-SCORING-IMPLEMENTATION.md`** - Quality scoring details
5. **`QUALITY-SCORING-TEST-RESULTS.md`** - Latest test results

### Common Questions

**Q: How do I add a new model?**
A: See "Workflow 3: Adding a New Model" above.

**Q: How do I modify quality scoring?**
A: See "Workflow 4: Modifying Quality Scoring" above.

**Q: Why are quality scores 0?**
A: Check Edge Function is v3. Redeploy if needed.

**Q: Why do small models fail?**
A: Models <70B parameters struggle with complex JSON. Use larger models.

**Q: How do I test with premium models?**
A: See "Workflow 1: Testing Premium Models" above.

---

## ✅ Checklist Before Committing

- [ ] Code compiles: `npm run build`
- [ ] Tests pass: `npx playwright test`
- [ ] Edge Functions deployed (if changed)
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Commit message follows format
- [ ] Changes tested manually

---

**End of Development Guide**

For project context, see: `CLAUDE.md`, `.claude/PROJECT-CONTEXT.md`
For test results, see: `QUALITY-SCORING-TEST-RESULTS.md`
