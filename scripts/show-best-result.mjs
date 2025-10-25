import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function showBestResult() {
  // Get all completed batch jobs
  const { data: jobs } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false})
    .limit(10)

  if (!jobs || jobs.length === 0) {
    console.log('No successful batch jobs found')
    return
  }

  // Find the job with the highest success rate
  const bestJob = jobs.reduce((best, job) => {
    const bestRate = best.successful_runs / (best.successful_runs + best.failed_runs)
    const currentRate = job.successful_runs / (job.successful_runs + job.failed_runs)
    return currentRate > bestRate ? job : best
  })

  console.log('\n' + '='.repeat(100))
  console.log('📊 SYSTEM TEST RESULTS - BEST PERFORMING JOB')
  console.log('='.repeat(100) + '\n')

  console.log('🎯 BATCH JOB SUMMARY')
  console.log(`   Name: ${bestJob.name}`)
  console.log(`   Status: ${bestJob.status.toUpperCase()}`)
  console.log(`   Success Rate: ${bestJob.successful_runs}/${bestJob.successful_runs + bestJob.failed_runs} runs (${((bestJob.successful_runs / (bestJob.successful_runs + bestJob.failed_runs)) * 100).toFixed(1)}%)`)
  console.log(`   Documents: ${bestJob.total_documents}`)
  console.log(`   Models: ${bestJob.models_used.join(', ')}`)
  console.log(`   Created: ${new Date(bestJob.created_at).toLocaleString()}\n`)

  // Get runs for this batch
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('batch_job_id', bestJob.id)

  if (runs && runs.length > 0) {
    console.log('─'.repeat(100))
    console.log('🤖 MODEL PERFORMANCE')
    console.log('─'.repeat(100) + '\n')

    const successfulRuns = runs.filter(r => r.validation_passed)
    const failedRuns = runs.filter(r => !r.validation_passed)

    if (successfulRuns.length > 0) {
      console.log('✅ SUCCESSFUL EXTRACTIONS:\n')

      for (const run of successfulRuns) {
        console.log(`Model: ${run.model}`)
        console.log(`Validation: ✅ PASSED`)
        console.log(`Execution Time: ${run.execution_time_ms}ms`)
        console.log(`Cost: $${run.cost || 0}`)

        if (run.extracted_data) {
          console.log(`\nExtracted Data:`)
          const data = typeof run.extracted_data === 'string' ? JSON.parse(run.extracted_data) : run.extracted_data
          const preview = JSON.stringify(data, null, 2)
          if (preview.length > 800) {
            console.log(preview.substring(0, 800) + '\n   ... (truncated)')
          } else {
            console.log(preview)
          }
        }
        console.log('')
      }
    }

    if (failedRuns.length > 0) {
      console.log('❌ FAILED EXTRACTIONS:\n')

      for (const run of failedRuns) {
        console.log(`Model: ${run.model}`)
        console.log(`Validation: ❌ FAILED`)
        console.log(`Execution Time: ${run.execution_time_ms}ms\n`)

        if (run.validation_errors && run.validation_errors.length > 0) {
          console.log(`Validation Errors:`)
          for (const err of run.validation_errors) {
            console.log(`   • ${err.message}`)
            console.log(`     Path: ${err.instancePath || 'root'}`)
          }
        }

        console.log(`\n💡 PROMPT IMPROVEMENT SUGGESTIONS:`)

        if (run.validation_errors) {
          const errorTypes = run.validation_errors.map(e => e.keyword).filter(Boolean)

          if (errorTypes.includes('type')) {
            console.log(`   1. Add explicit type examples in prompt (e.g., "Return dates as strings in YYYY-MM-DD format")`)
          }
          if (errorTypes.includes('required')) {
            console.log(`   2. Emphasize required fields: "All fields must be present, use null if data is missing"`)
          }
          if (errorTypes.includes('format')) {
            console.log(`   3. Specify exact formats: "Dates: YYYY-MM-DD, Numbers: numeric only, no formatting"`)
          }

          console.log(`   4. Consider switching to a more reliable model (GPT-4o, Claude Sonnet 3.5)`)
          console.log(`   5. Test with simpler schema first, then add complexity`)
        }

        console.log('')
      }
    }
  }

  // Get analytics
  const { data: analytics } = await supabase
    .from('batch_analytics')
    .select('*')
    .eq('batch_job_id', bestJob.id)

  if (analytics && analytics.length > 0) {
    console.log('─'.repeat(100))
    console.log('📈 ANALYTICS & INSIGHTS')
    console.log('─'.repeat(100) + '\n')

    for (const analytic of analytics) {
      const successRate = (analytic.success_count / (analytic.success_count + analytic.failure_count) * 100).toFixed(1)

      console.log(`Model: ${analytic.model}`)
      console.log(`   Success Rate: ${successRate}%`)
      console.log(`   Avg Execution Time: ${analytic.avg_execution_time_ms}ms`)
      console.log(`   Total Cost: $${analytic.total_cost}`)

      if (analytic.common_errors && analytic.common_errors.length > 0) {
        console.log(`   Common Errors:`)
        for (const err of analytic.common_errors) {
          console.log(`      • ${err.error} (occurred ${err.count}×)`)
        }
      }

      if (analytic.attribute_failures && Object.keys(analytic.attribute_failures).length > 0) {
        console.log(`   Attribute Failures:`)
        for (const [attr, failures] of Object.entries(analytic.attribute_failures)) {
          const total = failures.missing + failures.type_mismatch + failures.format_violation
          console.log(`      • ${attr}: ${total} failures (${failures.missing}M, ${failures.type_mismatch}T, ${failures.format_violation}F)`)
        }
      }

      console.log('')
    }
  }

  console.log('='.repeat(100))
  console.log('📋 SUMMARY')
  console.log('='.repeat(100) + '\n')

  console.log('✅ SYSTEM CAPABILITIES DEMONSTRATED:')
  console.log('   • Document upload and text extraction')
  console.log('   • AI-powered prompt optimization (400-800 words)')
  console.log('   • Automatic JSON schema generation')
  console.log('   • Multi-model LLM extraction')
  console.log('   • Schema-based validation')
  console.log('   • Comprehensive analytics and error analysis')
  console.log('   • Actionable improvement suggestions\n')

  console.log('🎯 KEY INSIGHTS:')
  console.log(`   • Success Rate: ${((bestJob.successful_runs / (bestJob.successful_runs + bestJob.failed_runs)) * 100).toFixed(1)}%`)
  console.log(`   • Model Used: ${bestJob.models_used[0]}`)
  console.log(`   • Processing Time: ~${runs[0]?.execution_time_ms}ms per document`)

  if (bestJob.successful_runs === 0) {
    console.log(`   • Model Reliability: Low - consider using GPT-4o Mini or Claude Sonnet`)
  } else if (bestJob.successful_runs === bestJob.total_documents) {
    console.log(`   • Model Reliability: Excellent - 100% validation success`)
  } else {
    console.log(`   • Model Reliability: Moderate - some validation failures`)
  }

  console.log('\n' + '='.repeat(100) + '\n')
}

showBestResult().catch(console.error)
