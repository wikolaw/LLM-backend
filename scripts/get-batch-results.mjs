import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function getBatchResults() {
  // Get most recent batch job
  const { data: jobs, error: jobError } = await supabase
    .from('batch_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (jobError || !jobs || jobs.length === 0) {
    console.error('❌ No batch jobs found')
    return
  }

  const job = jobs[0]

  console.log('\n' + '='.repeat(100))
  console.log('📊 BATCH JOB RESULTS')
  console.log('='.repeat(100) + '\n')

  console.log(`📦 Batch: ${job.name}`)
  console.log(`🆔 ID: ${job.id}`)
  console.log(`📅 Created: ${new Date(job.created_at).toLocaleString()}`)
  console.log(`✅ Status: ${job.status.toUpperCase()}`)
  console.log(`📄 Documents: ${job.completed_documents}/${job.total_documents}`)
  console.log(`🎯 Successful Runs: ${job.successful_runs}`)
  console.log(`❌ Failed Runs: ${job.failed_runs}`)
  console.log(`🤖 Models: ${job.models_used.join(', ')}`)
  console.log('')

  // Get runs
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .eq('batch_job_id', job.id)
    .order('created_at', { ascending: false })

  if (!runsError && runs && runs.length > 0) {
    console.log('─'.repeat(100))
    console.log('🔍 INDIVIDUAL RUNS')
    console.log('─'.repeat(100) + '\n')

    for (const run of runs) {
      console.log(`🤖 Model: ${run.model}`)
      console.log(`   Status: ${run.status}`)
      console.log(`   Validation: ${run.validation_passed ? '✅ PASSED' : '❌ FAILED'}`)
      console.log(`   Execution Time: ${run.execution_time_ms}ms`)

      if (run.extracted_data) {
        console.log(`   ✅ Extracted Data:`)
        const data = typeof run.extracted_data === 'string' ? JSON.parse(run.extracted_data) : run.extracted_data
        console.log(JSON.stringify(data, null, 2).split('\n').map(line => '      ' + line).join('\n'))
      }

      if (run.validation_errors && run.validation_errors.length > 0) {
        console.log(`   ⚠️  Validation Errors:`)
        for (const err of run.validation_errors) {
          console.log(`      - ${err.message} (path: ${err.instancePath})`)
        }
      }

      if (run.error_message) {
        console.log(`   ❌ Error: ${run.error_message}`)
      }

      console.log('')
    }
  }

  // Get analytics
  const { data: analytics, error: analyticsError } = await supabase
    .from('batch_analytics')
    .select('*')
    .eq('batch_job_id', job.id)

  if (!analyticsError && analytics && analytics.length > 0) {
    console.log('─'.repeat(100))
    console.log('📈 ANALYTICS')
    console.log('─'.repeat(100) + '\n')

    for (const analytic of analytics) {
      console.log(`🤖 Model: ${analytic.model}`)
      console.log(`   Success: ${analytic.success_count}/${analytic.success_count + analytic.failure_count}`)
      console.log(`   Success Rate: ${((analytic.success_count / (analytic.success_count + analytic.failure_count)) * 100).toFixed(1)}%`)
      console.log(`   Avg Time: ${analytic.avg_execution_time_ms}ms`)
      console.log(`   Total Cost: $${analytic.total_cost}`)

      if (analytic.common_errors && analytic.common_errors.length > 0) {
        console.log(`   Common Errors:`)
        for (const err of analytic.common_errors) {
          console.log(`      - ${err.error} (${err.count}×)`)
        }
      }

      if (analytic.attribute_failures && Object.keys(analytic.attribute_failures).length > 0) {
        console.log(`   Attribute Failures:`)
        for (const [attr, failures] of Object.entries(analytic.attribute_failures)) {
          console.log(`      - ${attr}: Missing=${failures.missing}, Type=${failures.type_mismatch}, Format=${failures.format_violation}`)
        }
      }

      console.log('')
    }
  }

  console.log('='.repeat(100))
  console.log('✅ RESULTS COMPLETE')
  console.log('='.repeat(100) + '\n')
}

getBatchResults().catch(console.error)
