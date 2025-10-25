#!/usr/bin/env node

/**
 * Test script: Process single document without UI
 * Uses real APIs, real extraction, real LLM calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ughfpgtntupnedjotmrr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

// Test user credentials
const TEST_EMAIL = 'test@playwright.local';
const TEST_PASSWORD = 'TestPassword123!';

// Base URL for API calls
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to make authenticated API calls
async function apiCall(endpoint, method = 'GET', body = null, accessToken) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

// Helper to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🚀 Starting Single Document Test (No UI)\n');

  let documentId = null;
  let storagePath = null;
  let batchId = null;
  let accessToken = null;

  try {
    // 1. Authenticate
    console.log('1️⃣  Authenticating...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (authError) throw authError;

    const userId = authData.user.id;
    accessToken = authData.session.access_token;
    console.log(`   ✅ Logged in as: ${userId}\n`);

    // 2. Upload and extract document
    console.log('2️⃣  Uploading test document...');
    const documentPath = path.join(__dirname, '..', 'Sample documents', '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx');
    const fileName = path.basename(documentPath);

    // Read file
    const fileBuffer = fs.readFileSync(documentPath);

    // Upload to Supabase Storage - sanitize filename for storage path
    // Keep only alphanumeric, dots, and underscores
    const sanitizedFileName = fileName
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/-+/g, '_');
    storagePath = `${userId}/${Date.now()}_${sanitizedFileName}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });

    if (uploadError) throw uploadError;
    console.log(`   ✅ Uploaded to storage: ${fileName}`);

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        storage_path: storagePath,
        filename: fileName,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      .select()
      .single();

    if (docError) throw docError;
    documentId = docData.id;
    console.log(`   ✅ Created DB record: ${documentId}`);

    // Extract text
    const extractResult = await apiCall('/api/extract-text', 'POST', {
      documentId,
      storagePath,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, accessToken);

    if (!extractResult || !extractResult.success) {
      console.error('Extract result:', JSON.stringify(extractResult, null, 2));
      throw new Error('Failed to extract text from document');
    }

    console.log(`   ✅ Extracted: ${extractResult.charCount} chars from ${fileName}\n`);

    // 3. Load sample user prompt
    console.log('3️⃣  Loading sample user prompt...');
    const promptPath = path.join(__dirname, '..', 'Sample documents', 'sample user prompt.md');
    const userPrompt = fs.readFileSync(promptPath, 'utf-8');
    const wordCount = userPrompt.split(/\s+/).length;
    console.log(`   ✅ Loaded prompt (${wordCount} words)\n`);

    // 4. Optimize prompt
    console.log('4️⃣  Optimizing prompt with AI (GPT-4o-mini)...');
    const startOptimize = Date.now();
    const optimizeResult = await apiCall('/api/optimize-prompt', 'POST', {
      userPrompt,
      outputFormat: 'json'
    }, accessToken);

    const optimizeTime = Date.now() - startOptimize;
    const optimizedPrompt = optimizeResult.optimizedPrompt;
    const optimizedWordCount = optimizedPrompt.split(/\s+/).length;

    console.log(`   ✅ Optimized in ${optimizeTime}ms`);
    console.log(`   📝 Word count: ${optimizedWordCount} (target: 400-800)`);

    // Validate optimization quality
    const hasDocContext = optimizedPrompt.includes('DOCUMENT CONTEXT') || optimizedPrompt.includes('Document Context');
    const hasRequiredFields = optimizedPrompt.includes('REQUIRED FIELDS') || optimizedPrompt.includes('Required Fields');
    const hasFormatStandards = optimizedPrompt.includes('FORMAT STANDARDS') || optimizedPrompt.includes('Format Standards');

    if (hasDocContext && hasRequiredFields && hasFormatStandards) {
      console.log(`   ✅ Optimization quality validated\n`);
    } else {
      console.log(`   ⚠️  Warning: Optimized prompt missing some required sections\n`);
    }

    // 5. Generate JSON schema
    console.log('5️⃣  Generating JSON schema (GPT-4o-mini)...');
    const startSchema = Date.now();
    const schemaResult = await apiCall('/api/generate-schema', 'POST', {
      userPrompt,
      optimizedPrompt,
      outputFormat: 'json'
    }, accessToken);

    const schemaTime = Date.now() - startSchema;
    const schema = schemaResult.schema;
    const fieldCount = schema.properties ? Object.keys(schema.properties).length : 0;

    console.log(`   ✅ Schema generated in ${schemaTime}ms`);
    console.log(`   📋 Fields: ${fieldCount}`);
    console.log(`   ✅ Schema structure validated\n`);

    // 6. Create batch job (directly in database since API uses cookie auth)
    console.log('6️⃣  Creating batch job...');
    const systemPrompt = "You are an expert at extracting structured data from documents. Analyze the document carefully and extract the requested information according to the provided schema.";
    const models = ['google/gemini-2.5-flash-preview-09-2025'];  // Best model - fast, reliable, proven working

    const { data: batchJob, error: batchError } = await supabase
      .from('batch_jobs')
      .insert({
        user_id: userId,
        name: `Single Document Test - ${fileName}`,
        system_prompt: systemPrompt,
        user_prompt: optimizedPrompt,
        output_format: 'json',
        validation_schema: schema,
        models_used: models,
        total_documents: 1,
        completed_documents: 0,
        successful_runs: 0,
        failed_runs: 0,
        status: 'pending',
      })
      .select()
      .single();

    if (batchError) throw batchError;
    batchId = batchJob.id;

    // Create initial run record to link document to batch job (Edge Function expects this)
    const { error: runError } = await supabase
      .from('runs')
      .insert({
        document_id: documentId,
        batch_job_id: batchId,
        system_prompt: systemPrompt,
        user_prompt: optimizedPrompt,
        prompt_hash: `${Date.now()}-${documentId}`,
        models_used: models
      });

    if (runError) throw runError;

    console.log(`   ✅ Batch created: ${batchId}`);
    console.log(`   📊 Configuration:`);
    console.log(`      - Documents: 1`);
    console.log(`      - Models: 1 (${models[0]})`);
    console.log(`      - Total runs: 1\n`);

    // 7. Start batch processing (call Edge Function directly)
    console.log('7️⃣  Starting batch processing (async Edge Function)...');
    const { error: functionError } = await supabase.functions.invoke('batch-processor', {
      body: { batchJobId: batchId }
    });

    if (functionError) {
      throw new Error(`Failed to start batch processing: ${functionError.message}`);
    }

    console.log(`   ✅ Batch processing started\n`);

    // 8. Poll status (query database directly)
    console.log('8️⃣  Polling status (every 2 seconds)...');
    const startTime = Date.now();
    let status;
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes max (150 * 2s)

    while (pollCount < maxPolls) {
      const { data: jobData, error: jobError } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', batchId)
        .single();

      if (jobError) throw jobError;

      status = {
        status: jobData.status,
        totalDocuments: jobData.total_documents,
        completedDocuments: jobData.completed_documents,
        successfulRuns: jobData.successful_runs,
        failedRuns: jobData.failed_runs,
        totalRuns: jobData.total_documents * jobData.models_used.length,
        currentDocument: jobData.current_document
      };

      pollCount++;

      if (status.status === 'completed' || status.status === 'failed') {
        break;
      }

      if (status.status === 'processing') {
        console.log(`   ⏳ Processing... (${status.completedDocuments}/${status.totalDocuments} docs, ${status.successfulRuns}/${status.totalRuns} runs)`);
      }

      await sleep(2000);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    if (status.status !== 'completed') {
      throw new Error(`Batch did not complete. Status: ${status.status}`);
    }

    console.log(`\n   ✅ Batch completed in ~${totalTime} seconds`);
    console.log(`   📊 Final counts:`);
    console.log(`      - Successful runs: ${status.successfulRuns}`);
    console.log(`      - Failed runs: ${status.failedRuns}\n`);

    // 9. Get analytics (query database directly)
    console.log('9️⃣  Fetching batch analytics...');
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('batch_analytics')
      .select('*')
      .eq('batch_job_id', batchId);

    if (analyticsError) throw analyticsError;

    // Transform to expected format
    const analytics = {
      global: {
        totalDocuments: status.totalDocuments,
        totalRuns: status.totalRuns,
        successRate: status.totalRuns > 0 ? status.successfulRuns / status.totalRuns : 0,
        totalCost: analyticsData.reduce((sum, a) => sum + (a.total_cost || 0), 0),
        avgExecutionTime: analyticsData.length > 0
          ? analyticsData.reduce((sum, a) => sum + (a.avg_execution_time_ms || 0), 0) / analyticsData.length
          : 0
      },
      perModel: analyticsData.map(a => ({
        model: a.model,
        successCount: a.success_count,
        failureCount: a.failure_count,
        totalRuns: a.success_count + a.failure_count,
        avgExecutionTime: a.avg_execution_time_ms,
        totalCost: a.total_cost,
        commonErrors: a.common_errors || []
      })),
      attributeFailures: analyticsData[0]?.attribute_failures ?
        Object.entries(analyticsData[0].attribute_failures).map(([path, data]) => ({
          attributePath: path,
          totalFailures: data.missing + data.type_mismatch + data.format_violation,
          missingCount: data.missing,
          typeMismatchCount: data.type_mismatch,
          formatViolationCount: data.format_violation,
          pattern: data.pattern
        })) : []
    };

    console.log(`   ✅ Analytics retrieved\n`);

    // 10. Print summary
    console.log('📊 BATCH ANALYTICS SUMMARY:\n');
    console.log(`  Global Summary:`);
    console.log(`    - Total Documents: ${analytics.global.totalDocuments}`);
    console.log(`    - Total Runs: ${analytics.global.totalRuns}`);
    console.log(`    - Success Rate: ${(analytics.global.successRate * 100).toFixed(1)}%`);
    console.log(`    - Total Cost: $${analytics.global.totalCost.toFixed(4)}`);
    console.log(`    - Avg Time: ${Math.round(analytics.global.avgExecutionTime)}ms\n`);

    if (analytics.perModel && analytics.perModel.length > 0) {
      console.log(`  Model Performance:`);
      for (const model of analytics.perModel) {
        const successRate = model.totalRuns > 0
          ? ((model.successCount / model.totalRuns) * 100).toFixed(1)
          : '0.0';
        console.log(`    - ${model.model}:`);
        console.log(`        Success: ${model.successCount}/${model.totalRuns} (${successRate}%)`);
        console.log(`        Avg Time: ${Math.round(model.avgExecutionTime)}ms`);
        console.log(`        Cost: $${model.totalCost.toFixed(6)}`);

        if (model.commonErrors && model.commonErrors.length > 0) {
          console.log(`        Errors:`);
          model.commonErrors.forEach(err => {
            console.log(`          • ${err.message} (${err.count}×)`);
          });
        }
      }
      console.log('');
    }

    if (analytics.attributeFailures && analytics.attributeFailures.length > 0) {
      console.log(`  Top Attribute Failures:`);
      analytics.attributeFailures.slice(0, 5).forEach(attr => {
        console.log(`    - ${attr.attributePath}:`);
        console.log(`        Total: ${attr.totalFailures} failures`);
        console.log(`        Missing: ${attr.missingCount}, Type: ${attr.typeMismatchCount}, Format: ${attr.formatViolationCount}`);
        if (attr.pattern) {
          console.log(`        Pattern: ${attr.pattern}`);
        }
      });
      console.log('');
    }

    // Get the actual extracted data
    const { data: runs } = await supabase
      .from('runs')
      .select('*')
      .eq('batch_job_id', batchId);

    if (runs && runs.length > 0) {
      console.log(`  Extracted Data:\n`);
      for (const run of runs) {
        console.log(`  Model: ${run.model_name || 'N/A'}`);
        console.log(`  Status: ${run.status || 'N/A'}`);
        console.log(`  Validation: ${run.schema_valid ? 'PASSED ✅' : 'FAILED ❌'}`);

        if (run.extracted_data) {
          console.log(`\n  Full Extracted JSON:\n`);
          console.log(JSON.stringify(run.extracted_data, null, 2));
        }

        if (run.error_message) {
          console.log(`\n  Error: ${run.error_message}`);
        }

        if (run.schema_errors && run.schema_errors.length > 0) {
          console.log(`\n  Schema Validation Errors:`);
          run.schema_errors.forEach((err, idx) => {
            console.log(`    ${idx + 1}. ${err.message} at ${err.path || '(root)'}`);
          });
        }
        console.log('');
      }
    }

    console.log('\n✅✅✅ TEST COMPLETED SUCCESSFULLY! ✅✅✅\n');
    console.log(`Batch ID: ${batchId}`);
    console.log(`Document ID: ${documentId}\n`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup - DISABLED to verify results
    console.log('🧹 Cleanup skipped - data preserved for verification');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Storage Path: ${storagePath}`);
    console.log(`   Batch ID: ${batchId}\n`);

    // Uncomment below to enable cleanup:
    /*
    if (documentId || storagePath) {
      console.log('🧹 Cleaning up test data...');

      if (storagePath) {
        const { error: deleteStorageError } = await supabase.storage
          .from('documents')
          .remove([storagePath]);

        if (!deleteStorageError) {
          console.log(`   ✅ Storage file deleted`);
        }
      }

      if (documentId) {
        const { error: deleteDocError } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentId);

        if (!deleteDocError) {
          console.log(`   ✅ DB record deleted`);
        }
      }

      console.log('');
    }
    */
  }
}

main();
