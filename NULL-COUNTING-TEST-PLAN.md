# Null Value Counting - Test Plan

## 🎯 Objective
Verify that the null counting feature correctly:
1. Counts null values in LLM responses
2. Displays null counts in the model comparison table
3. Highlights null values in JSON output
4. Helps users identify underperforming models

---

## 📋 Prerequisites

### 1. Database Migration (REQUIRED)
⚠️ **Before testing, apply this SQL in Supabase Studio:**

```sql
-- Add null counting fields
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS null_count INT DEFAULT 0;

COMMENT ON COLUMN outputs.null_count IS 'Total number of fields with null values in the JSON output';

ALTER TABLE batch_analytics
  ADD COLUMN IF NOT EXISTS avg_null_count NUMERIC(10,2);

COMMENT ON COLUMN batch_analytics.avg_null_count IS 'Average number of null values per document for this model';
```

**Apply at:** https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/sql/new

### 2. Environment Status
- ✅ Edge Function deployed: `batch-processor`
- ✅ Frontend changes: Ready (in local code)
- ✅ Dev server: Running at http://localhost:3001
- ⚠️ Database: Needs migration (see above)

---

## 🧪 Manual Test Scenario

### Test Case 1: Create a Batch with Models That Return Nulls

**Goal:** Test with a prompt that's intentionally vague, causing models to return null values.

#### Step 1: Navigate to Dashboard
1. Open: http://localhost:3001/dashboard
2. Login with: `test@playwright.local` / `TestPassword123!`

#### Step 2: Upload Documents
Upload 1-2 documents from `Sample documents/` folder

#### Step 3: Create Intentionally Vague Prompt
Use this user prompt (designed to produce nulls):

```
Extract information from this document
```

**Why this works:** This prompt is too vague, so models will return null for fields they can't identify.

#### Step 4: Optimize & Generate Schema
Click:
1. "Optimize Prompt with AI" (will generate a better prompt)
2. "Generate JSON Schema"

The schema might include fields like:
- `document_type`
- `contract_name`
- `parties`
- `dates`
- `amounts`

#### Step 5: Select Multiple Models
Choose 2-3 models with different capabilities:
- ✅ `openai/gpt-4o-mini` (good performance)
- ✅ `google/gemini-2.0-flash-exp` (good performance)
- ✅ `meta-llama/llama-3.1-8b-instruct` (may produce more nulls)

#### Step 6: Start Processing
1. Name the batch: "Null Counting Test"
2. Click "Start Batch Processing"
3. Wait for completion (~1-2 minutes)

---

## ✅ Expected Results

### 1. Model Comparison Table

**What to look for:**

```
Model                           Success Rate  Null Values         Avg Time  Cost
────────────────────────────────────────────────────────────────────────────
google/gemini-2.0-flash-exp     100%         ⚠️ 2.3 nulls/doc   1200ms   $0.01
openai/gpt-4o-mini              100%         ⚠️ 4.1 nulls/doc   1500ms   $0.02
meta-llama/llama-3.1-8b         90%          ⚠️ 8.5 nulls/doc   1800ms   $0.03
```

**Key indicators:**
- ⚠️ Yellow warning icon appears when avgNullCount > 0
- Number shown as "X.X nulls/doc"
- Models with more nulls are clearly visible

### 2. Null Highlighting in JSON

Click "Detailed Results" tab, then click any output row.

**Expected:**
```json
{
  "contract_name": "Arlandabanan Contract",
  "parties": {
    "customer_name": "Banverket",
    "supplier_name": null  ← HIGHLIGHTED IN YELLOW
  },
  "start_date": "2024-01-15",
  "end_date": null         ← HIGHLIGHTED IN YELLOW
  "total_amount": 5000000
}
```

Null values should have:
- **Yellow background** (`bg-yellow-200`)
- **Dark yellow text** (`text-yellow-800`)
- **Bold font**

### 3. Browser Console Logs

Open DevTools Console (F12), look for:

```
Null count for document 1: 2
Null count for document 2: 3
Average null count for model gpt-4o-mini: 2.5
```

---

## 🔍 Verification Checklist

### Database Verification

Run this query in Supabase SQL Editor:

```sql
-- Check if null_count column exists and has data
SELECT
  model,
  null_count,
  validation_passed,
  json_payload->>'contract_name' as contract_name,
  json_payload->>'parties' as parties
FROM outputs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- `null_count` column exists
- Values are integers (0, 1, 2, 3, etc.)
- Matches actual null values in `json_payload`

### Analytics Verification

```sql
-- Check avg_null_count in analytics
SELECT
  model,
  success_count,
  failure_count,
  avg_null_count
FROM batch_analytics
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- `avg_null_count` column exists
- Values are decimals (2.5, 4.1, etc.)
- Higher for models that struggled with vague prompts

---

## 🐛 Troubleshooting

### Issue: "Column null_count does not exist"
**Fix:** Run the database migration SQL (see Prerequisites #1)

### Issue: Null counts show as "0" for all models
**Possible causes:**
1. Prompt is too good (models extracted everything)
2. Schema has too few fields
3. Documents have all data available

**Fix:** Use the vague prompt from Step 3, or test with incomplete documents

### Issue: Nulls aren't highlighted in JSON
**Check:**
1. Browser DevTools Console for JavaScript errors
2. View source of `<pre>` element - should see `<span class="bg-yellow-200">`

### Issue: Edge Function errors
**Check:**
1. Edge Function logs: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/functions/batch-processor/logs
2. Look for "countNullValues is not defined" or import errors

---

## 📊 Success Criteria

✅ **Test passes if:**

1. **Null counts visible:** Yellow ⚠️ badge shows in model table
2. **Counts are accurate:** Match actual null fields in JSON
3. **Highlighting works:** Null values have yellow background
4. **Database stores data:** `null_count` and `avg_null_count` populated
5. **No errors:** No console errors or Edge Function failures

---

## 🚀 Advanced Testing

### Test Case 2: Compare Good vs Bad Models

**Setup:**
- Use the same documents and prompt
- Run 5 models: 2 premium (GPT-4o, Claude), 3 budget (Llama, Gemini Flash)

**Expected:**
- Premium models: Lower null counts (1-3 nulls/doc)
- Budget models: Higher null counts (5-10 nulls/doc)
- Clear visual distinction in table

### Test Case 3: Zero Nulls Scenario

**Setup:**
- Use a very detailed, optimized prompt
- Use high-quality models
- Use complete documents

**Expected:**
- All models show "0" null counts (gray, not yellow)
- No highlighting in JSON output

---

## 📝 Test Results Template

```
Test Date: YYYY-MM-DD HH:MM
Tester: [Your Name]

✅ Prerequisites:
  - Database migration applied: [YES/NO]
  - Edge Function deployed: [YES/NO]
  - Dev server running: [YES/NO]

✅ Results:
  - Null counts displayed in table: [YES/NO]
  - Yellow warning icons visible: [YES/NO]
  - JSON highlighting works: [YES/NO]
  - Database stores null_count: [YES/NO]
  - Analytics calculates avg_null_count: [YES/NO]

📊 Sample Data:
  - Model with lowest nulls: [model name] ([X] nulls/doc)
  - Model with highest nulls: [model name] ([X] nulls/doc)
  - Total documents tested: [N]
  - Total models tested: [N]

🐛 Issues Found:
  1. [Issue description]
  2. [Issue description]

💡 Notes:
  [Any observations or feedback]
```

---

## 🎬 Next Steps After Testing

1. **If test passes:** Ready for production deployment
2. **If test fails:** Review errors, check logs, fix issues
3. **Feedback:** Document any UX improvements needed

---

**Questions?** Check the main README or CLAUDE.md for system documentation.
