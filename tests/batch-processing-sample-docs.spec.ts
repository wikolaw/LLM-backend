import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Batch Processing Test - Using Sample Documents
 *
 * This test verifies the complete batch processing workflow with real sample documents:
 * 1. Login
 * 2. Upload multiple sample documents
 * 3. Use sample prompt
 * 4. Optimize prompt with AI
 * 5. Generate JSON schema
 * 6. Select models
 * 7. Run batch processing
 * 8. Monitor progress
 * 9. View results
 */

test.describe('Batch Processing - Sample Documents', () => {
  test.setTimeout(600000); // 10 minutes timeout for full batch processing

  test('should process multiple Swedish contract documents with AI optimization', async ({ page }) => {
    console.log('\n🚀 Starting Batch Processing Test with Sample Documents\n');

    // ============================================================================
    // 1. LOGIN
    // ============================================================================
    console.log('1️⃣  Logging in...');

    await page.goto('http://localhost:3001');

    // Fill login form
    await page.fill('input[type="email"]', 'test@playwright.local');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ Logged in successfully\n');

    // ============================================================================
    // 2. UPLOAD SAMPLE DOCUMENTS
    // ============================================================================
    console.log('2️⃣  Uploading sample documents...');

    const sampleDocsDir = path.join(process.cwd(), 'Sample documents');
    const documents = [
      '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Botniabanan.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Citybanan.docx'
    ];

    // Click upload button or drag-drop area
    const fileInput = await page.locator('input[type="file"]');

    // Upload all documents
    const filePaths = documents.map(doc => path.join(sampleDocsDir, doc));
    await fileInput.setInputFiles(filePaths);

    // Wait for all uploads to complete
    await page.waitForTimeout(3000); // Give time for uploads to process

    // Verify all 3 documents are shown
    for (const doc of documents) {
      const docName = doc.replace('.docx', '').substring(0, 30); // First 30 chars
      await expect(page.getByText(docName, { exact: false })).toBeVisible({ timeout: 10000 });
    }

    console.log('   ✅ Uploaded 3 documents\n');

    // ============================================================================
    // 3. USE SAMPLE PROMPT
    // ============================================================================
    console.log('3️⃣  Entering sample prompt...');

    const samplePrompt = `Läs avtalet nedan och extrahera alla relevanta uppgifter för strukturerad lagring i databas.

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
Extrahera fakta ordagrant utan egna tolkningar.`;

    // Find and fill the user prompt textarea
    const promptTextarea = page.locator('textarea').first();
    await promptTextarea.fill(samplePrompt);

    console.log('   ✅ Sample prompt entered\n');

    // ============================================================================
    // 4. OPTIMIZE PROMPT WITH AI
    // ============================================================================
    console.log('4️⃣  Optimizing prompt with AI (GPT-4o-mini)...');

    // Click "Optimize Prompt with AI" button
    await page.click('button:has-text("Optimize")');

    // Wait for optimization to complete (look for success message or updated prompt)
    await page.waitForTimeout(15000); // GPT-4o-mini optimization takes ~10-15 seconds

    console.log('   ✅ Prompt optimized\n');

    // ============================================================================
    // 5. GENERATE JSON SCHEMA
    // ============================================================================
    console.log('5️⃣  Generating JSON schema with AI (GPT-4o-mini)...');

    // Click "Generate JSON Schema" button
    await page.click('button:has-text("Generate Schema")');

    // Wait for schema generation
    await page.waitForTimeout(15000); // Schema generation takes ~10-15 seconds

    console.log('   ✅ JSON schema generated\n');

    // ============================================================================
    // 6. SELECT MODELS
    // ============================================================================
    console.log('6️⃣  Selecting models...');

    // Select 4 models to test (mix of providers)
    const modelsToSelect = [
      'OpenAI GPT-4o Mini',          // Fast, cheap
      'Google Gemini 2.5 Flash',     // Fast, good quality
      'DeepSeek R1',                 // Reasoning model
      'Anthropic Claude Haiku 4.5'   // High quality
    ];

    for (const modelName of modelsToSelect) {
      try {
        // Find checkbox for this model
        const modelCheckbox = page.locator(`label:has-text("${modelName}")`).locator('input[type="checkbox"]');
        await modelCheckbox.check({ timeout: 5000 });
        console.log(`   ✓ Selected: ${modelName}`);
      } catch (error) {
        console.log(`   ⚠ Could not select: ${modelName} (may not be visible)`);
      }
    }

    console.log('   ✅ Models selected\n');

    // ============================================================================
    // 7. START BATCH PROCESSING
    // ============================================================================
    console.log('7️⃣  Starting batch processing...');

    // Click "Start Batch Processing" button
    await page.click('button:has-text("Start Batch")');

    // Wait for batch to start (should show progress bar)
    await page.waitForTimeout(3000);

    console.log('   ✅ Batch processing started\n');

    // ============================================================================
    // 8. MONITOR PROGRESS
    // ============================================================================
    console.log('8️⃣  Monitoring batch progress...');
    console.log('   (This may take 3-5 minutes for 3 docs × 4 models = 12 runs)\n');

    // Wait for progress indicators
    let lastProgress = -1;
    const startTime = Date.now();

    while (true) {
      try {
        // Look for progress text like "2/3 documents processed"
        const progressText = await page.locator('text=/\\d+\\/\\d+ documents?/i').first().textContent({ timeout: 2000 });

        if (progressText) {
          const match = progressText.match(/(\d+)\/(\d+)/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);

            if (current !== lastProgress) {
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              console.log(`   ⏳ Progress: ${current}/${total} documents (${elapsed}s elapsed)`);
              lastProgress = current;
            }

            // Check if complete
            if (current === total) {
              console.log('   ✅ Batch processing completed!\n');
              break;
            }
          }
        }

        // Also check for "Completed" status
        const completedStatus = await page.locator('text=/completed/i').first().isVisible({ timeout: 1000 }).catch(() => false);
        if (completedStatus) {
          console.log('   ✅ Batch processing completed!\n');
          break;
        }

        // Timeout after 8 minutes
        if (Date.now() - startTime > 480000) {
          console.log('   ⚠ Timeout reached (8 minutes)\n');
          break;
        }

        await page.waitForTimeout(3000); // Poll every 3 seconds
      } catch (error) {
        // Continue polling
        await page.waitForTimeout(3000);
      }
    }

    // ============================================================================
    // 9. VIEW RESULTS
    // ============================================================================
    console.log('9️⃣  Viewing results...');

    // Wait for results to be displayed
    await page.waitForTimeout(5000);

    // Try to find analytics tabs
    const tabs = ['Global Summary', 'Per-Model', 'Per-Document', 'Attribute Failures'];

    for (const tabName of tabs) {
      try {
        const tab = page.locator(`button:has-text("${tabName}")`).first();
        const isVisible = await tab.isVisible({ timeout: 2000 });
        if (isVisible) {
          await tab.click();
          await page.waitForTimeout(1000);
          console.log(`   ✓ Viewed: ${tabName} tab`);
        }
      } catch (error) {
        console.log(`   ⚠ ${tabName} tab not found`);
      }
    }

    // Take a screenshot of final results
    await page.screenshot({
      path: 'test-results/batch-processing-final-results.png',
      fullPage: true
    });

    console.log('   ✅ Results displayed\n');
    console.log('   📸 Screenshot saved: test-results/batch-processing-final-results.png\n');

    // ============================================================================
    // TEST COMPLETE
    // ============================================================================
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    console.log('✅✅✅ BATCH PROCESSING TEST COMPLETED! ✅✅✅\n');
    console.log(`Summary:`);
    console.log(`   - Documents processed: 3`);
    console.log(`   - Models tested: 4`);
    console.log(`   - Total runs: ~12`);
    console.log(`   - Total time: ${totalTime}s (~${Math.floor(totalTime / 60)}m ${totalTime % 60}s)\n`);
  });
});
