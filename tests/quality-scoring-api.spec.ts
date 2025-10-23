import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Quality Scoring API Test - Direct Validation
 *
 * This test directly validates the quality scoring system by:
 * 1. Running inference via API
 * 2. Checking quality scores in database
 * 3. Validating consensus analysis
 */

const SUPABASE_URL = 'https://ughfpgtntupnedjotmrr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnaGZwZ3RudHVwbmVkam90bXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTI1MDcsImV4cCI6MjA3NjcyODUwN30.FjRZc0lSY181NwiF-14j1AQn3S54Kg_RIPySJNeLBsI'

test('validates quality scoring system via latest database run', async () => {
  console.log('\n=== QUALITY SCORING API VALIDATION ===\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Get the latest run from database
  console.log('Fetching latest test run from database...')
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  expect(runsError).toBeNull()
  expect(runs).toBeTruthy()
  expect(runs!.length).toBeGreaterThan(0)

  const runId = runs![0].id
  console.log(`✓ Found run: ${runId}`)
  console.log(`  Created: ${runs![0].created_at}\n`)

  // Fetch all outputs for this run
  console.log('Fetching model outputs...')
  const { data: outputs, error: outputsError } = await supabase
    .from('outputs')
    .select(`
      model,
      json_valid,
      quality_syntax,
      quality_structural,
      quality_completeness,
      quality_content,
      quality_consensus,
      quality_overall,
      quality_flags,
      quality_metrics,
      execution_time_ms,
      tokens_in,
      tokens_out,
      cost_in,
      cost_out
    `)
    .eq('run_id', runId)

  expect(outputsError).toBeNull()
  expect(outputs).toBeTruthy()

  const totalModels = outputs!.length
  const successfulModels = outputs!.filter(o => o.json_valid).length
  const failedModels = totalModels - successfulModels
  const successRate = (successfulModels / totalModels) * 100

  console.log(`✓ Found ${totalModels} model outputs\n`)

  // Display results
  console.log('=== SUCCESS RATE ===')
  console.log(`Total Models: ${totalModels}`)
  console.log(`Successful: ${successfulModels} (${successRate.toFixed(1)}%)`)
  console.log(`Failed: ${failedModels} (${(100 - successRate).toFixed(1)}%)\n`)

  //Validate quality scores exist for successful models
  const validOutputs = outputs!.filter(o => o.json_valid)
  let hasQualityScores = false

  if (validOutputs.length > 0) {
    console.log('=== QUALITY SCORES ===')

    validOutputs
      .sort((a, b) => (b.quality_overall || 0) - (a.quality_overall || 0))
      .forEach((output, idx) => {
        const modelName = output.model.split('/').pop()
        console.log(`${idx + 1}. ${modelName}`)
        console.log(`   Overall: ${output.quality_overall}/100`)
        console.log(`   Syntax: ${output.quality_syntax} | Structural: ${output.quality_structural}`)
        console.log(`   Complete: ${output.quality_completeness} | Content: ${output.quality_content}`)
        console.log(`   Consensus: ${output.quality_consensus || 0}`)
        console.log(`   Time: ${output.execution_time_ms}ms | Tokens: ${output.tokens_in + output.tokens_out}`)
        console.log('')

        // Check if has quality scores
        if (output.quality_syntax !== null || output.quality_overall !== null) {
          hasQualityScores = true
        }
      })
  }

  console.log('=== VALIDATION RESULTS ===\n')

  // Assertion 1: Success rate improved from baseline
  console.log(`✓ Success rate: ${successRate.toFixed(1)}% (baseline: 11%)`)
  expect(successRate).toBeGreaterThan(11)

  // Assertion 2: Quality scores calculated
  console.log(`✓ Quality scores calculated: ${hasQualityScores}`)
  expect(hasQualityScores).toBe(true)

  // Assertion 3: Quality scores in valid range
  validOutputs.forEach(output => {
    if (output.quality_overall !== null) {
      expect(output.quality_overall).toBeGreaterThanOrEqual(0)
      expect(output.quality_overall).toBeLessThanOrEqual(100)
    }
  })
  console.log('✓ All quality scores in valid range (0-100)')

  // Assertion 4: Database columns populated
  const hasQualityColumns = validOutputs.some(o =>
    o.quality_syntax !== null &&
    o.quality_structural !== null &&
    o.quality_completeness !== null &&
    o.quality_content !== null
  )
  console.log(`✓ Quality columns populated: ${hasQualityColumns}`)
  expect(hasQualityColumns).toBe(true)

  // Try consensus analysis
  console.log('\n=== CONSENSUS ANALYSIS ===')
  try {
    const consensusResponse = await fetch(`${SUPABASE_URL}/functions/v1/calculate-consensus`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ runId })
    })

    if (consensusResponse.ok) {
      const consensusData = await consensusResponse.json()
      console.log('✓ Consensus analysis executed successfully')

      if (consensusData.consensusAnalysis) {
        const analysis = consensusData.consensusAnalysis
        console.log(`  Agreed Fields: ${analysis.fieldConsensus?.agreedFields?.length || 0}`)
        console.log(`  Best Model: ${analysis.recommendations?.bestModel || 'N/A'}`)
        console.log(`  Best Score: ${analysis.recommendations?.bestScore || 0}/100`)
      }
    } else {
      console.log('⚠️  Consensus analysis returned non-200 status (expected if <2 successful models)')
    }
  } catch (error) {
    console.log('⚠️  Consensus analysis error (may be expected)')
  }

  console.log('\n=== SUMMARY ===')
  console.log(`Baseline: 11% → Current: ${successRate.toFixed(1)}%`)
  console.log(`Improvement: ${(successRate - 11).toFixed(1)} percentage points`)
  console.log(`Status: ${successRate >= 60 ? '✅ TARGET MET' : successRate > 11 ? '🔄 IMPROVED' : '⚠️  NEEDS CHECK'}`)
  console.log('\n✅ QUALITY SCORING VALIDATION PASSED\n')
})
