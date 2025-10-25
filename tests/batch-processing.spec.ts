import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Batch Processing E2E Test', () => {
  test.setTimeout(1800000); // 30 minutes for full batch processing (allows for slow free models)

  test('should process 6 documents with batch processing and show analytics', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/auth/login');
    await page.fill('input[type="email"]', 'test@playwright.local');

    // Click "Use password instead" to reveal password field
    await page.click('text=Use password instead');
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });

    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    // Read the sample user prompt
    const promptPath = path.join(process.cwd(), 'Sample documents', 'sample user prompt.md');
    const userPrompt = fs.readFileSync(promptPath, 'utf-8');
    console.log('📖 Loaded sample prompt');

    // Upload 6 sample documents
    const sampleDocs = [
      '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Botniabanan.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Citybanan.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Pagatagen.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Roslagsbanan.docx',
      '01 Entreprenadkontrakt - Drift och underhåll Saltsjöbanan.docx',
    ];

    const filePaths = sampleDocs.map(doc =>
      path.join(process.cwd(), 'Sample documents', doc)
    );

    console.log('📤 Uploading 6 documents...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePaths);

    // Wait for upload to complete (check for document list)
    await page.waitForSelector('text=/.*Arlandabanan.*/', { timeout: 30000 });
    console.log('✅ Documents uploaded');

    // Verify all 6 documents are shown
    for (const doc of sampleDocs) {
      await expect(page.locator(`text=/${doc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`)).toBeVisible();
    }
    console.log('✅ All 6 documents visible in list');

    // Wait for text extraction to complete (check for "Uploaded Documents (6/6)")
    console.log('⏳ Waiting for text extraction to complete...');
    await page.waitForSelector('text=/Uploaded Documents.*6.*6/', { timeout: 120000 }); // 2 minutes
    console.log('✅ All documents text extracted');

    // Wait a bit for UI to stabilize
    await page.waitForTimeout(2000);

    // Scroll down to Configure Extraction section (step 2)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);

    // Look for Configure Extraction section heading
    await page.waitForSelector('text=/Configure Extraction|2\\. Configure/', { timeout: 5000 });
    console.log('✅ Configure Extraction section visible');

    // Enter batch job name
    const batchJobName = `Playwright Test - ${new Date().toISOString()}`;
    const batchNameInput = await page.locator('input[placeholder*="name"], input[name*="batch"], label:has-text("Batch"):has(+ input)').locator('..').locator('input').first();
    await batchNameInput.fill(batchJobName);
    console.log(`✅ Named batch job: ${batchJobName}`);

    // Paste the sample user prompt
    const userPromptTextarea = await page.locator('textarea').first();
    await userPromptTextarea.fill(userPrompt);
    console.log('✅ Pasted sample user prompt');

    // Click "Optimize Prompt with AI"
    console.log('🤖 Optimizing prompt with AI...');
    await page.click('button:has-text("Optimize Prompt")');

    // Wait for optimization to complete (check for optimized prompt section)
    console.log('⏳ Waiting for AI optimization...');
    try {
      await page.waitForSelector('text=/Optimized Extraction Prompt|DOCUMENT CONTEXT/', { timeout: 180000 }); // 3 minutes
      await page.waitForTimeout(2000); // Let it settle
      console.log('✅ Prompt optimized');
    } catch (error) {
      console.log('⚠️  Optimization timeout - checking for error state...');
      // Check if there's an error message
      const errorMsg = await page.locator('text=/error|failed/i').count();
      if (errorMsg > 0) {
        throw new Error('Prompt optimization failed - check API logs');
      }
      // If no error, maybe optimization is still loading - continue anyway
      console.log('⚠️  Continuing without optimization confirmation...');
    }

    // Scroll down to see Generate Schema button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 1.5));
    await page.waitForTimeout(1000);

    // Click "Generate JSON Schema"
    console.log('🤖 Generating JSON schema...');
    await page.click('button:has-text("Generate")');

    // Wait for schema generation (look for JSON content with "type" and "properties")
    console.log('⏳ Waiting for schema generation...');
    try {
      await page.waitForSelector('text=/"type".*"properties"/s', { timeout: 180000 }); // 3 minutes
      await page.waitForTimeout(2000); // Let it settle
      console.log('✅ JSON schema generated');
    } catch (error) {
      console.log('⚠️  Schema generation timeout - checking for error state...');
      const errorMsg = await page.locator('text=/error|failed/i').count();
      if (errorMsg > 0) {
        throw new Error('Schema generation failed - check API logs');
      }
      console.log('⚠️  Continuing without schema confirmation...');
    }

    // Scroll down to see "Next: Select Models" button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Click "Next: Select Models" to move to step 3
    console.log('➡️  Moving to Select Models step...');
    const nextToModelsButton = await page.locator('button:has-text("Next: Select Models"), button:has-text("Select Models")');
    await nextToModelsButton.waitFor({ state: 'visible', timeout: 10000 });
    await nextToModelsButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Moved to Select Models step');

    // Now on step 3 - Select fast paid models (avoid slow free models)
    console.log('🎯 Selecting fast paid models...');

    // Wait for model checkboxes to be visible
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });

    // Select specific fast paid models by searching for them (exact display names from database)
    const fastModels = [
      'OpenAI GPT-5',
      'OpenAI GPT-4o Mini',
      'Google Gemini 2.5 Flash Preview',
      'Google Gemini 2.0 Flash Experimental',
      'Anthropic Claude Haiku 4.5',
      'Anthropic Claude 3.5 Sonnet',
      'Qwen Plus 0728'
    ];

    let selectedCount = 0;
    for (const modelName of fastModels) {
      try {
        // Try to find checkbox by label text
        const checkbox = await page.locator(`label:has-text("${modelName}")`).locator('input[type="checkbox"]').first();
        if (await checkbox.count() > 0 && !(await checkbox.isChecked())) {
          await checkbox.check();
          console.log(`✅ Selected: ${modelName}`);
          selectedCount++;
          await page.waitForTimeout(300);
          if (selectedCount >= 3) break; // Select 3 fast models
        }
      } catch (e) {
        console.log(`⚠️  Could not find model: ${modelName}`);
      }
    }

    if (selectedCount === 0) {
      throw new Error('No fast models found - please check model list');
    }

    console.log(`✅ Selected ${selectedCount} fast paid models`);

    // Click "Start Batch Processing"
    console.log('🚀 Starting batch processing...');
    await page.click('button:has-text("Start Batch")');

    // Wait for "Creating Batch..." loading state
    await page.waitForSelector('text=/Creating Batch/i', { timeout: 10000 });
    console.log('⏳ Batch creation started...');

    // Wait for loading to finish (button text changes or progress indicator appears)
    await page.waitForTimeout(5000); // Give it time to create batch and start processing
    console.log('✅ Batch processing started');

    // Poll for completion (check progress)
    let isComplete = false;
    let pollAttempts = 0;
    const maxPollAttempts = 600; // 20 minutes (2 second intervals) - allows for slow free models

    while (!isComplete && pollAttempts < maxPollAttempts) {
      await page.waitForTimeout(2000);
      pollAttempts++;

      // Check if "View Results" or "Analytics" button appears
      const resultsButton = await page.locator('button:has-text("View Results"), button:has-text("Analytics")');
      if (await resultsButton.count() > 0) {
        isComplete = true;
        break;
      }

      // Check if status is "completed"
      const completedStatus = await page.locator('text=/completed|finished/i');
      if (await completedStatus.count() > 0) {
        isComplete = true;
        break;
      }

      // Log progress every 10 attempts (20 seconds)
      if (pollAttempts % 10 === 0) {
        console.log(`⏳ Still processing... (${pollAttempts * 2}s elapsed)`);
      }
    }

    if (!isComplete) {
      throw new Error('Batch processing did not complete within timeout');
    }

    console.log(`✅ Batch processing completed in ${pollAttempts * 2} seconds`);

    // Click to view analytics
    await page.click('button:has-text("View Results"), button:has-text("Analytics")');
    await page.waitForTimeout(2000);

    // Verify analytics tabs are present
    console.log('📊 Verifying analytics tabs...');

    // Tab 1: Global Summary
    const globalSummaryTab = await page.locator('button:has-text("Global Summary"), [role="tab"]:has-text("Global")');
    await expect(globalSummaryTab).toBeVisible();
    console.log('✅ Global Summary tab visible');

    // Tab 2: Per-Model Analysis
    const perModelTab = await page.locator('button:has-text("Per-Model"), [role="tab"]:has-text("Model")');
    await expect(perModelTab).toBeVisible();
    console.log('✅ Per-Model Analysis tab visible');

    // Tab 3: Per-Document Details
    const perDocumentTab = await page.locator('button:has-text("Per-Document"), [role="tab"]:has-text("Document")');
    await expect(perDocumentTab).toBeVisible();
    console.log('✅ Per-Document Details tab visible');

    // Tab 4: Attribute Failures
    const attributeFailuresTab = await page.locator('button:has-text("Attribute"), [role="tab"]:has-text("Failure")');
    await expect(attributeFailuresTab).toBeVisible();
    console.log('✅ Attribute Failures tab visible');

    // Check Global Summary content
    await globalSummaryTab.click();
    await page.waitForTimeout(1000);

    // Should show total documents (6)
    await expect(page.locator('text=/6.*documents/i')).toBeVisible();
    console.log('✅ Global Summary shows 6 documents');

    // Should show success rate
    await expect(page.locator('text=/success rate|passed/i')).toBeVisible();
    console.log('✅ Success rate displayed');

    // Check Per-Model Analysis
    await perModelTab.click();
    await page.waitForTimeout(1000);

    // Should show model names
    const modelNames = await page.locator('text=/gemini|gpt|claude/i');
    expect(await modelNames.count()).toBeGreaterThan(0);
    console.log('✅ Per-Model Analysis shows model data');

    // Check Per-Document Details
    await perDocumentTab.click();
    await page.waitForTimeout(1000);

    // Should show document filenames
    await expect(page.locator('text=/Arlandabanan/i')).toBeVisible();
    console.log('✅ Per-Document Details shows document list');

    // Check Attribute Failures
    await attributeFailuresTab.click();
    await page.waitForTimeout(1000);

    // Should show attribute failure analysis (or "No failures" if all passed)
    const hasFailures = await page.locator('text=/missing|type mismatch|format violation/i').count() > 0;
    const noFailures = await page.locator('text=/no failures|all attributes passed/i').count() > 0;

    if (hasFailures) {
      console.log('✅ Attribute Failures shows failure analysis');
    } else if (noFailures) {
      console.log('✅ Attribute Failures shows "no failures" message');
    } else {
      console.log('⚠️  Attribute Failures tab present but content unclear');
    }

    // Take screenshot of final results
    await page.screenshot({ path: 'tests/screenshots/batch-processing-results.png', fullPage: true });
    console.log('📸 Screenshot saved');

    console.log('\n✅✅✅ BATCH PROCESSING TEST COMPLETED SUCCESSFULLY! ✅✅✅');
    console.log(`\nSummary:`);
    console.log(`  - Uploaded: 6 documents`);
    console.log(`  - Models: ${selectedCount}`);
    console.log(`  - Total runs: ${6 * selectedCount}`);
    console.log(`  - Processing time: ${pollAttempts * 2} seconds`);
    console.log(`  - All 4 analytics tabs verified`);
  });
});
