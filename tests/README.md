# Playwright Automated Tests

This directory contains end-to-end tests for the LLM Document Analysis application using Playwright.

## Prerequisites

Before running the tests, ensure you have completed these setup steps:

### 1. Enable Email/Password Authentication in Supabase

Follow the instructions in [SETUP-TEST-USER.md](../SETUP-TEST-USER.md):

1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/auth/providers
2. Enable "Email" provider
3. Turn ON "Enable sign ups"
4. Turn OFF "Confirm email" (Important for testing!)
5. Click "Save"

### 2. Create Test User

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/auth/users
2. Click "Add user"
3. Fill in:
   - Email: `test@playwright.local`
   - Password: `TestPassword123!`
   - Auto Confirm User: ✅ (Check this!)
4. Click "Create user"

**Option B: Via SQL Editor**

1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/sql/new
2. Run the SQL from SETUP-TEST-USER.md

### 3. Install Playwright

```bash
npm install
npx playwright install chromium
```

This will install Playwright and the Chromium browser for testing.

### 4. Start Dev Server

Make sure the development server is running:

```bash
npm run dev
```

The application should be accessible at http://localhost:3000

---

## Running Tests

### Run All Tests (Headless)

```bash
npm test
```

This runs all tests in headless mode (no visible browser window).

### Run Tests with UI Mode (Interactive)

```bash
npm run test:ui
```

Opens Playwright's UI mode where you can:
- See all tests
- Run tests step-by-step
- Time travel through test execution
- View traces and screenshots

### Run Tests in Headed Mode (Visible Browser)

```bash
npm run test:headed
```

Runs tests with a visible browser window. Useful for debugging.

### Run Specific Test File

```bash
npx playwright test document-analysis.spec.ts
```

### Run Specific Test Case

```bash
npx playwright test -g "complete document analysis workflow"
```

### View Last Test Report

```bash
npm run test:report
```

Opens the HTML report from the last test run.

---

## Test Files

### `document-analysis.spec.ts`

Main end-to-end test suite covering:

#### Test Suites:

1. **LLM Document Analysis Workflow**
   - `complete document analysis workflow with Swedish contract`
     - Full workflow from login to results export
     - Uses free models for cost-effective testing
     - Tests all 4 steps: Upload → Prompts → Models → Results
   - `login page displays test credentials`
   - `cannot access dashboard without authentication`

2. **Document Upload**
   - `upload TXT file successfully`
   - Tests file upload and text extraction

3. **Model Selection**
   - `displays available models grouped by cost`
   - `run button disabled when no models selected`

#### What the Main Test Does:

**Step 1: Login**
- Navigates to login page
- Switches to password authentication
- Logs in with test credentials
- Verifies redirect to dashboard

**Step 2: Upload Document**
- Uploads `test-contract-arlanda.txt`
- Waits for text extraction (Edge Function)
- Verifies document info displayed

**Step 3: Configure Prompts**
- Verifies Swedish contract schema is selected
- Checks that default prompts are populated
- Proceeds to model selection

**Step 4: Select Models**
- Selects free models (Llama 3.1 8B, Mistral 7B)
- Optionally can select premium models for comparison

**Step 5: Run Inference**
- Clicks "Run X Models" button
- Waits for LLM inference to complete (30-60s)
- Verifies no errors during execution

**Step 6: Verify Results**
- Checks that results section appears
- Verifies model output cards are displayed
- Confirms valid JSON outputs
- Checks metrics (execution time, tokens, cost)

**Step 7: Export Results**
- Tests export functionality
- Verifies JSON download triggered

**Final: Screenshot**
- Saves full-page screenshot to `tests/screenshots/`

---

## Test Data

### Sample Document

The tests use `Sample documents/test-contract-arlanda.txt`, which contains a Swedish railway infrastructure contract with:

- **Contract name**: Arlandabanan DOU 2024-2028
- **Parties**: Trafikverket (Client) and Infranord AB (Contractor)
- **Type**: Operations and maintenance contract
- **Content**: ~4,000 characters of Swedish text

### Expected Output Schema

Tests verify extraction against the Swedish contract schema defined in `lib/schemas/extraction.ts`:

```typescript
{
  allmant: { kontraktsnamn, anlaggning_objekt, ... }
  parter: { bestallare, entreprenor }
  ekonomi: { arlig_ersattning_belopp, ... }
  infrastruktur: { sparlangd_km, antal_vaxlar, ... }
  ansvar: { regelverk }
  kvalitet_sakerhet: { certifieringar }
  andringar: { reglering }
  bilagor: { lista }
}
```

---

## Debugging Failed Tests

### View Trace

If a test fails, Playwright automatically saves a trace. View it with:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### Screenshots

Failed tests automatically save screenshots to:
```
test-results/
  document-analysis-complete-document-analysis-workflow-chromium/
    test-failed-1.png
```

### Videos

Test execution videos are saved for failed tests in the same directory.

### Run in Debug Mode

```bash
npx playwright test --debug
```

This opens Playwright Inspector where you can:
- Step through test execution
- Inspect page state
- View console logs

---

## Configuration

Test configuration is in `playwright.config.ts`:

- **Timeout**: 3 minutes per test (LLM inference is slow)
- **Workers**: 1 (tests run sequentially)
- **Retries**: 2 retries in CI, 0 locally
- **Screenshot**: On failure
- **Video**: On failure
- **Trace**: On first retry

---

## Continuous Integration

To run tests in CI:

```bash
# Install dependencies
npm ci
npx playwright install --with-deps chromium

# Run tests
npm test

# Generate report
npm run test:report
```

Set these environment variables in CI:
- `CI=true` - Enables retries and optimizations

---

## Troubleshooting

### "Test user doesn't exist" or "Invalid credentials"

- Make sure you've created the test user (see Prerequisites #2)
- Verify the user in Supabase dashboard under Authentication → Users

### "Cannot connect to http://localhost:3000"

- Make sure dev server is running: `npm run dev`
- Check that port 3000 is not blocked by firewall

### "Upload failed" or "Text extraction failed"

- Verify the `extract-text` Edge Function is deployed
- Check Edge Function logs in Supabase dashboard
- Ensure sample document exists: `Sample documents/test-contract-arlanda.txt`

### "Inference timeout" or "Models not responding"

- Check OpenRouter API key is set in `.env.local`
- Verify OpenRouter secret is set in Supabase: `OPENROUTER_API_KEY`
- Try increasing timeout in `playwright.config.ts`

### "Results not appearing"

- Check browser console for errors (run with `--headed`)
- Verify `run-llm-inference` Edge Function is deployed
- Check Supabase database for outputs in `outputs` table

---

## Cost Considerations

The main test uses **free models only** by default:
- Llama 3.1 8B Instruct (Free)
- Mistral 7B Instruct (Free)

**Estimated cost per test run**: $0.00

To test premium models (Claude, GPT-4), uncomment the line in the test:
```typescript
// await page.check('input[type="checkbox"][value*="claude"]').first()
```

**Estimated cost with premium models**: $0.05 - $0.15 per test run

---

## Next Steps

1. **Run the main workflow test**: `npm test`
2. **Review the HTML report**: `npm run test:report`
3. **Check screenshots**: `tests/screenshots/results-comparison.png`
4. **Add more test cases** for edge cases and error handling

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Configuration](https://playwright.dev/docs/test-configuration)
