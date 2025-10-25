import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDocuments() {
  console.log('🔍 Checking recent documents...\n')

  // Get recent documents
  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error fetching documents:', error)
    return
  }

  if (!docs || docs.length === 0) {
    console.log('ℹ️  No documents found')
    return
  }

  console.log(`Found ${docs.length} recent document(s):\n`)

  for (const doc of docs) {
    console.log(`📄 ${doc.filename || 'Unnamed'}`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   User: ${doc.user_id}`)
    console.log(`   Chars: ${doc.extracted_text_char_count || 0}`)
    console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`)
    console.log('')
  }

  // Also check batch_jobs with service role key
  console.log('\n🔍 Checking batch jobs (with elevated permissions)...\n')

  const { data: jobs, error: jobsError } = await supabase
    .from('batch_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (jobsError) {
    console.error('❌ Error fetching batch jobs:', jobsError)
    return
  }

  if (!jobs || jobs.length === 0) {
    console.log('ℹ️  No batch jobs found (even with service role)')
    return
  }

  console.log(`Found ${jobs.length} batch job(s):\n`)
  for (const job of jobs) {
    console.log(`📦 ${job.name || 'Unnamed'}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   User: ${job.user_id}`)
    console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`)
    console.log('')
  }
}

checkDocuments().catch(console.error)
