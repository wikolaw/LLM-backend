import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('\n' + '='.repeat(100))
console.log('🧪 RELIABLE MODEL TEST - GPT-4o Mini')
console.log('='.repeat(100) + '\n')

async function runTest() {
  // 1. Authenticate
  console.log('1️⃣  Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@playwright.local',
    password: 'TestPassword123!'
  })

  if (authError) throw authError
  console.log(`   ✅ Authenticated as: ${authData.user.id}\n`)

  // 2. Upload document
  console.log('2️⃣  Uploading test document...')
  const docPath = path.join(process.cwd(), 'Sample documents', '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx')
  const fileBuffer = fs.readFileSync(docPath)
  const filename = '01 Entreprenadkontrakt - Drift och underhåll Arlandabanan.docx'

  const storagePath = `${authData.user.id}/${Date.now()}-${filename}`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

  if (uploadError) throw uploadError
  console.log(`   ✅ Uploaded to storage: ${filename}`)

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      user_id: authData.user.id,
      filename,
      storage_path: storagePath
    })
    .select()
    .single()

  if (docError) throw docError
  console.log(`   ✅ Created DB record: ${doc.id}\n`)

  // 3. Extract text
  console.log('3️⃣  Extracting text from document...')
  const extractResponse = await fetch('http://localhost:3001/api/extract-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`
    },
    body: JSON.stringify({
      documentId: doc.id,
      storagePath
    })
  })

  if (!extractResponse.ok) {
    const error = await extractResponse.text()
    throw new Error(`Text extraction failed: ${error}`)
  }

  const { data: updatedDoc } = await supabase
    .from('documents')
    .select('extracted_text_char_count')
    .eq('id', doc.id)
    .single()

  console.log(`   ✅ Extracted: ${updatedDoc.extracted_text_char_count} chars\n`)

  // 4. Load user prompt
  console.log('4️⃣  Loading sample user prompt...')
  const promptPath = path.join(process.cwd(), 'Sample documents', 'sample user prompt.md')
  const userPrompt = fs.readFileSync(promptPath, 'utf-8')
  console.log(`   ✅ Loaded prompt (${userPrompt.split(' ').length} words)\n`)

  // 5. Optimize prompt
  console.log('5️⃣  Optimizing prompt with AI (GPT-4o-mini)...')
  const optimizeResponse = await fetch('http://localhost:3001/api/optimize-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`
    },
    body: JSON.stringify({
      userPrompt,
      outputFormat: 'json'
    })
  })

  if (!optimizeResponse.ok) {
    throw new Error('Prompt optimization failed')
  }

  const { optimizedPrompt } = await optimizeResponse.json()
  const wordCount = optimizedPrompt.split(' ').length
  console.log(`   ✅ Optimized prompt generated (${wordCount} words)`)
  console.log(`   📝 Preview: ${optimizedPrompt.substring(0, 150)}...\n`)

  // 6. Generate schema
  console.log('6️⃣  Generating JSON Schema (GPT-4o-mini)...')
  const schemaResponse = await fetch('http://localhost:3001/api/generate-schema', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`
    },
    body: JSON.stringify({
      userPrompt,
      optimizedPrompt,
      outputFormat: 'json'
    })
  })

  if (!schemaResponse.ok) {
    throw new Error('Schema generation failed')
  }

  const { schema } = await schemaResponse.json()
  const fieldCount = schema.properties ? Object.keys(schema.properties).length : 0
  console.log(`   ✅ Schema generated (${fieldCount} fields)\n`)

  // 7. Create batch job
  console.log('7️⃣  Creating batch job...')
  const systemPrompt = "You are an expert at extracting structured data from Swedish contract documents. Extract the requested information accurately and format it as valid JSON."

  const createResponse = await fetch('http://localhost:3001/api/batch/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`
    },
    body: JSON.stringify({
      name: `Reliable Model Test - ${new Date().toISOString()}`,
      documentIds: [doc.id],
      systemPrompt,
      userPrompt: optimizedPrompt,
      outputFormat: 'json',
      validationSchema: schema,
      models: ['openai/gpt-4o-mini'] // Reliable model
    })
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Batch creation failed: ${error}`)
  }

  const { batchJobId } = await createResponse.json()
  console.log(`   ✅ Batch job created: ${batchJobId}\n`)

  // 8. Start processing
  console.log('8️⃣  Starting batch processing...')
  const startResponse = await fetch(`http://localhost:3001/api/batch/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`
    },
    body: JSON.stringify({ batchJobId })
  })

  if (!startResponse.ok) {
    throw new Error('Failed to start batch processing')
  }

  console.log(`   ✅ Processing started\n`)

  // 9. Poll for completion
  console.log('9️⃣  Waiting for completion (polling every 3 seconds)...')
  let completed = false
  let attempts = 0
  const maxAttempts = 100 // 5 minutes

  while (!completed && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    attempts++

    const statusResponse = await fetch(`http://localhost:3001/api/batch/${batchJobId}/status`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    })

    const status = await statusResponse.json()

    if (status.status === 'completed') {
      completed = true
      console.log(`   ✅ Completed in ~${attempts * 3} seconds\n`)
    } else if (status.status === 'failed') {
      throw new Error('Batch processing failed')
    } else if (attempts % 10 === 0) {
      console.log(`   ⏳ Still processing... (${attempts * 3}s elapsed)`)
    }
  }

  if (!completed) {
    throw new Error('Timeout waiting for completion')
  }

  // 10. Get results
  console.log('🔟 Fetching results...\n')

  const { data: job } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', batchJobId)
    .single()

  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('batch_job_id', batchJobId)

  const { data: analytics } = await supabase
    .from('batch_analytics')
    .select('*')
    .eq('batch_job_id', batchJobId)

  // Display results
  console.log('='.repeat(100))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(100) + '\n')

  console.log('📦 BATCH JOB')
  console.log(`   Name: ${job.name}`)
  console.log(`   Status: ${job.status.toUpperCase()}`)
  console.log(`   Documents: ${job.completed_documents}/${job.total_documents}`)
  console.log(`   Success Rate: ${job.successful_runs}/${job.successful_runs + job.failed_runs} (${((job.successful_runs / (job.successful_runs + job.failed_runs)) * 100).toFixed(1)}%)\n`)

  if (runs && runs.length > 0) {
    console.log('─'.repeat(100))
    console.log('🤖 MODEL PERFORMANCE')
    console.log('─'.repeat(100) + '\n')

    for (const run of runs) {
      console.log(`Model: ${run.model}`)
      console.log(`Status: ${run.status}`)
      console.log(`Validation: ${run.validation_passed ? '✅ PASSED' : '❌ FAILED'}`)
      console.log(`Execution Time: ${run.execution_time_ms}ms`)
      console.log(`Cost: $${run.cost || 0}`)

      if (run.validation_passed && run.extracted_data) {
        console.log(`\n✅ EXTRACTED DATA (Valid JSON):`)
        const data = typeof run.extracted_data === 'string' ? JSON.parse(run.extracted_data) : run.extracted_data
        console.log(JSON.stringify(data, null, 2))
      }

      if (!run.validation_passed && run.validation_errors) {
        console.log(`\n❌ VALIDATION ERRORS:`)
        for (const err of run.validation_errors) {
          console.log(`   - ${err.message}`)
          console.log(`     Path: ${err.instancePath || 'root'}`)
          console.log(`     Expected: ${err.params ? JSON.stringify(err.params) : 'N/A'}`)
        }

        console.log(`\n💡 IMPROVEMENT SUGGESTIONS:`)
        console.log(`   1. Review the prompt to ensure it clearly specifies expected data types`)
        console.log(`   2. Add examples in the prompt showing the exact JSON structure needed`)
        console.log(`   3. Consider using a more reliable model (GPT-4o, Claude Sonnet)`)
        console.log(`   4. Simplify the schema if it's too complex for the model`)
      }

      if (run.error_message) {
        console.log(`\n❌ ERROR: ${run.error_message}`)
      }

      console.log('')
    }
  }

  // Cleanup
  console.log('─'.repeat(100))
  console.log('🧹 Cleaning up...\n')

  await supabase.storage.from('documents').remove([storagePath])
  await supabase.from('documents').delete().eq('id', doc.id)

  console.log('   ✅ Test data cleaned up\n')

  console.log('='.repeat(100))
  console.log('✅ TEST COMPLETE')
  console.log('='.repeat(100) + '\n')
}

runTest().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message)
  process.exit(1)
})
