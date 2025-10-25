/**
 * Single Document Test Script (No UI)
 * Tests batch processing with one document and GPT-4o
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ughfpgtntupnedjotmrr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

// Test credentials
const TEST_EMAIL = 'test@playwright.local';
const TEST_PASSWORD = 'TestPassword123!';

// Model to test
const MODEL = 'openai/gpt-4o';

// System prompt
const SYSTEM_PROMPT = `You are an AI assistant specialized in extracting structured data from documents.
Your task is to carefully read the provided document and extract the requested information according to the user's instructions.
Return only valid JSON that matches the provided schema. Do not include any explanatory text outside the JSON structure.`;

async function login() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    userId: data.user.id
  };
}

async function seedDocument(userId, filePath) {
  const fileName = path.basename(filePath);
  const fileBuffer = await fs.readFile(filePath);
  const fileContent = fileBuffer.toString('utf-8');

  // Insert document directly into database using service role key
  const response = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      filename: fileName,
      mime_type: 'text/plain',
      storage_path: `test/${fileName}`,
      full_text: fileContent
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Document seeding failed: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  return data[0].id;
}

async function optimizePrompt(token, userPrompt, outputFormat) {
  const response = await fetch('http://localhost:3000/api/optimize-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      userPrompt,
      outputFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`Prompt optimization failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.optimizedPrompt;
}

async function generateSchema(token, userPrompt, optimizedPrompt, outputFormat) {
  const response = await fetch('http://localhost:3000/api/generate-schema', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      userPrompt,
      optimizedPrompt,
      outputFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`Schema generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.schema;
}

async function createBatch(token, config) {
  const response = await fetch('http://localhost:3000/api/batch/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Batch creation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.batchId;
}

async function startBatch(token, batchId) {
  const response = await fetch('http://localhost:3000/api/batch/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ batchId }),
  });

  if (!response.ok) {
    throw new Error(`Batch start failed: ${response.statusText}`);
  }

  return await response.json();
}

async function pollStatus(token, batchId) {
  const maxAttempts = 150; // 5 minutes max (2s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`http://localhost:3000/api/batch/${batchId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Status polling failed: ${response.statusText}`);
    }

    const status = await response.json();

    console.log(`⏳ Progress: ${status.completedDocuments}/${status.totalDocuments} docs | ${status.successfulRuns}/${status.totalRuns} runs passed`);

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Batch processing timeout');
}

async function getAnalytics(token, batchId) {
  const response = await fetch(`http://localhost:3000/api/batch/${batchId}/analytics`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Analytics retrieval failed: ${response.statusText}`);
  }

  return await response.json();
}

async function main() {
  console.log('\n🚀 Starting Single Document Test (No UI)\n');

  const startTime = Date.now();

  try {
    // 1. Authenticate
    console.log('1️⃣  Authenticating...');
    const { accessToken, userId } = await login();
    console.log(`   ✅ Logged in as: ${userId}\n`);

    // 2. Load user prompt
    console.log('2️⃣  Loading sample user prompt...');
    const userPrompt = await fs.readFile('C:\\Project\\LLM-backend\\Sample documents\\sample user prompt.md', 'utf-8');
    console.log(`   ✅ Loaded prompt (${userPrompt.split(/\s+/).length} words)\n`);

    // 3. Seed document
    console.log('3️⃣  Seeding test document...');
    const docPath = 'C:\\Project\\LLM-backend\\Sample documents\\test-contract-arlanda.txt';
    const documentId = await seedDocument(userId, docPath);
    console.log(`   ✅ Seeded: test-contract-arlanda.txt (ID: ${documentId})\n`);

    // 4. Optimize prompt
    console.log('4️⃣  Optimizing prompt with AI (GPT-4o-mini)...');
    const optimizeStart = Date.now();
    const optimizedPrompt = await optimizePrompt(accessToken, userPrompt, 'json');
    const optimizeTime = Date.now() - optimizeStart;
    console.log(`   ✅ Optimized in ${optimizeTime}ms`);
    console.log(`   📝 Word count: ${optimizedPrompt.split(/\s+/).length}\n`);

    // 5. Generate schema
    console.log('5️⃣  Generating JSON schema (GPT-4o-mini)...');
    const schemaStart = Date.now();
    const schema = await generateSchema(accessToken, userPrompt, optimizedPrompt, 'json');
    const schemaTime = Date.now() - schemaStart;
    console.log(`   ✅ Schema generated in ${schemaTime}ms`);
    console.log(`   📋 Fields: ${Object.keys(schema.properties || {}).length}\n`);

    // 6. Create batch
    console.log('6️⃣  Creating batch job...');
    const batchId = await createBatch(accessToken, {
      name: 'Single Document Test - GPT-4o',
      documentIds: [documentId],
      models: [MODEL],
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: optimizedPrompt,
      outputFormat: 'json',
      validationSchema: schema,
    });
    console.log(`   ✅ Batch created: ${batchId}`);
    console.log(`   📊 Configuration:`);
    console.log(`      - Documents: 1`);
    console.log(`      - Models: 1 (${MODEL})`);
    console.log(`      - Total runs: 1\n`);

    // 7. Start processing
    console.log('7️⃣  Starting batch processing...');
    await startBatch(accessToken, batchId);
    console.log('   ✅ Processing started\n');

    // 8. Poll status
    console.log('8️⃣  Polling status (every 2 seconds)...');
    const finalStatus = await pollStatus(accessToken, batchId);
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n   ✅ Batch completed in ~${processingTime} seconds`);
    console.log(`   📊 Final counts:`);
    console.log(`      - Successful runs: ${finalStatus.successfulRuns}`);
    console.log(`      - Failed runs: ${finalStatus.failedRuns}\n`);

    // 9. Get analytics
    console.log('9️⃣  Fetching batch analytics...');
    const analytics = await getAnalytics(accessToken, batchId);
    console.log('   ✅ Analytics retrieved\n');

    // 10. Print summary
    console.log('═'.repeat(60));
    console.log('📊 BATCH ANALYTICS SUMMARY');
    console.log('═'.repeat(60));

    const global = analytics.global;
    console.log(`\n📈 Global Metrics:`);
    console.log(`   Total Documents: ${global.totalDocuments}`);
    console.log(`   Total Runs: ${global.totalRuns}`);
    console.log(`   Success Rate: ${global.overallSuccessRate.toFixed(1)}%`);
    console.log(`   Total Cost: $${global.totalCost.toFixed(4)}`);
    console.log(`   Avg Time: ${global.averageExecutionTime}ms`);

    if (analytics.perModel && analytics.perModel.length > 0) {
      console.log(`\n🤖 Model Performance:`);
      analytics.perModel.forEach(model => {
        console.log(`   - ${model.model}:`);
        console.log(`     Success: ${model.successCount}/${model.totalRuns} (${model.successRate.toFixed(1)}%)`);
        console.log(`     Avg Time: ${model.avgExecutionTime}ms`);
        console.log(`     Cost: $${model.totalCost.toFixed(4)}`);
        if (model.commonErrors && model.commonErrors.length > 0) {
          console.log(`     Errors: ${model.commonErrors[0].message} (${model.commonErrors[0].count}×)`);
        }
      });
    }

    if (analytics.attributeFailures && analytics.attributeFailures.length > 0) {
      console.log(`\n⚠️  Top Attribute Failures:`);
      analytics.attributeFailures.slice(0, 5).forEach(attr => {
        const total = attr.missingCount + attr.typeMismatchCount + attr.formatViolationCount;
        console.log(`   - ${attr.attributePath}: ${total} failures`);
        console.log(`     (${attr.missingCount}M, ${attr.typeMismatchCount}T, ${attr.formatViolationCount}F)`);
        if (attr.patternInsight) {
          console.log(`     💡 ${attr.patternInsight}`);
        }
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log(`\nTotal test time: ${processingTime} seconds`);
    console.log(`Model tested: ${MODEL}`);
    console.log(`Success: ${finalStatus.successfulRuns}/${finalStatus.totalRuns} runs\n`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
