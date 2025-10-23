import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { calculateQualityScores } from '../_shared/quality-scorer.ts'

interface InferenceRequest {
  runId: string
  documentText: string
  systemPrompt: string
  userPrompt: string
  models: Array<{
    name: string
    provider: string
    displayName: string
    supportsJsonMode: boolean
    priceIn: number
    priceOut: number
  }>
  jsonSchema: any
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }

    const {
      runId,
      documentText,
      systemPrompt,
      userPrompt,
      models,
      jsonSchema,
    }: InferenceRequest = await req.json()

    // Replace placeholder in user prompt
    const finalUserPrompt = userPrompt.replace('{DOCUMENT_TEXT}', documentText)

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: finalUserPrompt },
    ]

    // Execute all models in parallel
    const results = await Promise.all(
      models.map(async (model) => {
        const startTime = Date.now()

        try {
          const requestBody: any = {
            model: `${model.provider}/${model.name}`,
            messages,
            temperature: 0.1,
            max_tokens: 4000,
          }

          // Add JSON mode if supported
          if (model.supportsJsonMode && jsonSchema) {
            requestBody.response_format = {
              type: 'json_object',
              schema: jsonSchema,
            }
          }

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': Deno.env.get('APP_URL') || 'https://llm-analysis.com',
              'X-Title': 'LLM Document Analysis',
            },
            body: JSON.stringify(requestBody),
          })

          const executionTimeMs = Date.now() - startTime

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
          }

          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || ''

          // Try to parse JSON
          let jsonPayload: any = null
          let jsonValid = false
          let qualityDetails: any = null

          try {
            jsonPayload = JSON.parse(content)
            jsonValid = true

            // Calculate quality scores for valid JSON
            qualityDetails = calculateQualityScores(content, jsonPayload)
          } catch (_e) {
            jsonValid = false
          }

          // Calculate costs
          const tokensIn = data.usage?.prompt_tokens || 0
          const tokensOut = data.usage?.completion_tokens || 0
          const costIn = tokensIn * model.priceIn
          const costOut = tokensOut * model.priceOut

          // Save output to database with quality scores
          await supabaseClient.from('outputs').insert({
            run_id: runId,
            model: `${model.provider}/${model.name}`,
            json_valid: jsonValid,
            json_payload: jsonPayload,
            raw_response: content,
            cost_in: costIn,
            cost_out: costOut,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            execution_time_ms: executionTimeMs,
            error_message: null,
            // Quality scores (will be null if JSON invalid)
            quality_syntax: qualityDetails?.scores.syntax || null,
            quality_structural: qualityDetails?.scores.structural || null,
            quality_completeness: qualityDetails?.scores.completeness || null,
            quality_content: qualityDetails?.scores.content || null,
            quality_consensus: 0, // Will be calculated later by consensus function
            quality_overall: qualityDetails?.scores.overall || 0,
            quality_flags: qualityDetails?.flags || null,
            quality_metrics: qualityDetails?.metrics || null,
          })

          return {
            model: model.displayName,
            success: true,
            jsonValid,
            executionTimeMs,
            tokensIn,
            tokensOut,
            totalCost: costIn + costOut,
          }
        } catch (error) {
          const executionTimeMs = Date.now() - startTime

          // Save error to database
          await supabaseClient.from('outputs').insert({
            run_id: runId,
            model: `${model.provider}/${model.name}`,
            json_valid: false,
            json_payload: null,
            raw_response: null,
            cost_in: null,
            cost_out: null,
            tokens_in: null,
            tokens_out: null,
            execution_time_ms: executionTimeMs,
            error_message: error.message,
            // Null quality scores for errors
            quality_syntax: null,
            quality_structural: null,
            quality_completeness: null,
            quality_content: null,
            quality_consensus: null,
            quality_overall: 0,
            quality_flags: null,
            quality_metrics: null,
          })

          return {
            model: model.displayName,
            success: false,
            jsonValid: false,
            executionTimeMs,
            error: error.message,
          }
        }
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
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
