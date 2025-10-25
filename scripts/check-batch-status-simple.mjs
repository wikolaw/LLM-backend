import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBatchJobs() {
  console.log('🔍 Checking recent batch jobs...\n')

  // Get recent batch jobs
  const { data: jobs, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching batch jobs:', error)
    return
  }

  if (!jobs || jobs.length === 0) {
    console.log('ℹ️  No batch jobs found')
    return
  }

  console.log(`Found ${jobs.length} recent batch job(s):\n`)
  console.log('='.repeat(100))

  for (const job of jobs) {
    console.log(`\n📦 Batch Job: ${job.name || 'Unnamed'}`)
    console.log(`   ID: ${job.id}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   Documents: ${job.completed_documents}/${job.total_documents}`)
    console.log(`   Runs: ${job.successful_runs} successful, ${job.failed_runs} failed`)
    console.log(`   Models: ${job.models_used ? job.models_used.join(', ') : 'N/A'}`)
    console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`)
    console.log(`   Updated: ${new Date(job.updated_at).toLocaleString()}`)

    if (job.current_document) {
      console.log(`   Current Document: ${job.current_document}`)
    }

    // Get runs for this batch
    const { data: runs, error: runsError } = await supabase
      .from('runs')
      .select('id, model, status, validation_passed, execution_time_ms, error_message')
      .eq('batch_job_id', job.id)

    if (!runsError && runs) {
      console.log(`\n   📊 Runs (${runs.length} total):`)
      for (const run of runs) {
        const statusIcon = run.status === 'completed' ? '✅' : run.status === 'failed' ? '❌' : '⏳'
        const validationIcon = run.validation_passed ? '✅' : '❌'
        console.log(`      ${statusIcon} ${run.model} - ${run.status} (Validation: ${validationIcon})`)
        if (run.error_message) {
          console.log(`         Error: ${run.error_message.substring(0, 100)}...`)
        }
        if (run.execution_time_ms) {
          console.log(`         Time: ${run.execution_time_ms}ms`)
        }
      }
    }

    console.log('\n' + '-'.repeat(100))
  }

  // Check for any stuck processing jobs
  const stuckJobs = jobs.filter(j => j.status === 'processing')
  if (stuckJobs.length > 0) {
    console.log(`\n⚠️  WARNING: ${stuckJobs.length} job(s) stuck in 'processing' state`)
    for (const job of stuckJobs) {
      const age = Date.now() - new Date(job.updated_at).getTime()
      const ageMinutes = Math.floor(age / 60000)
      console.log(`   - ${job.name}: stuck for ${ageMinutes} minutes`)
    }
  }
}

checkBatchJobs().catch(console.error)
