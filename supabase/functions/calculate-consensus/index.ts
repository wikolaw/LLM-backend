/**
 * Calculate Consensus Edge Function
 *
 * Called after all models have completed inference.
 * Analyzes outputs across models to:
 * - Calculate consensus scores
 * - Update quality_overall with consensus weights
 * - Generate cross-model analysis
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { scoreConsensus } from '../_shared/quality-scorer.ts'
import { analyzeConsensus } from '../_shared/consensus-analyzer.ts'

interface ConsensusRequest {
  runId: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { runId }: ConsensusRequest = await req.json()

    if (!runId) {
      throw new Error('runId is required')
    }

    // Fetch all outputs for this run (only valid JSON)
    const { data: outputs, error: fetchError } = await supabaseClient
      .from('outputs')
      .select('*')
      .eq('run_id', runId)
      .eq('json_valid', true)

    if (fetchError) {
      throw new Error(`Failed to fetch outputs: ${fetchError.message}`)
    }

    if (!outputs || outputs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No valid outputs to analyze',
          consensusAnalysis: null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Prepare data for consensus analysis
    const modelOutputs = outputs.map(output => ({
      model: output.model,
      json: output.json_payload,
      raw: output.raw_response || '',
      scores: {
        syntax: output.quality_syntax || 0,
        structural: output.quality_structural || 0,
        completeness: output.quality_completeness || 0,
        content: output.quality_content || 0,
        consensus: 0, // Will be calculated
        overall: output.quality_overall || 0,
      },
    }))

    // Calculate consensus analysis
    const consensusAnalysis = analyzeConsensus(modelOutputs)

    // Update each output with consensus score and recalculate overall
    const updatePromises = outputs.map(async (output) => {
      // Calculate consensus score for this model
      const consensusScore = scoreConsensus(
        output.json_payload,
        modelOutputs.map(o => ({ model: o.model, json: o.json }))
      )

      // Recalculate overall score with consensus weight
      const newOverall = Math.round(
        (output.quality_syntax || 0) * 0.25 +
        (output.quality_structural || 0) * 0.20 +
        (output.quality_completeness || 0) * 0.20 +
        (output.quality_content || 0) * 0.20 +
        consensusScore * 0.15
      )

      // Update database
      const { error: updateError } = await supabaseClient
        .from('outputs')
        .update({
          quality_consensus: consensusScore,
          quality_overall: newOverall,
        })
        .eq('id', output.id)

      if (updateError) {
        console.error(`Failed to update output ${output.id}:`, updateError)
      }

      return {
        model: output.model,
        consensusScore,
        overallScore: newOverall,
      }
    })

    await Promise.all(updatePromises)

    // Return consensus analysis
    return new Response(
      JSON.stringify({
        success: true,
        runId,
        consensusAnalysis,
        updatedModels: outputs.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Consensus calculation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
