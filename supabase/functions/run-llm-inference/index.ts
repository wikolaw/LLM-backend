import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateAgainstSchema, type OutputFormat } from '../_shared/schema-validator.ts'

interface InferenceRequest {
  runId: string
  documentText: string
  systemPrompt: string // Already format-specific (includes "JSON" or "JSON Lines")
  userPrompt: string // AI-optimized extraction prompt
  outputFormat: OutputFormat // 'json' or 'jsonl'
  validationSchema: object // JSON Schema for validation
  models: Array<{
    name: string
    provider: string
    displayName: string
    supportsJsonMode: boolean
    priceIn: number
    priceOut: number
  }>
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
      outputFormat,
      validationSchema,
      models,
    }: InferenceRequest = await req.json()

    // Combine user prompt with document text
    const finalUserPrompt = `${userPrompt}\n\nDocument text:\n${documentText}`

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

          // Add JSON mode if supported (only for 'json' format, not 'jsonl')
          if (model.supportsJsonMode && outputFormat === 'json' && validationSchema) {
            requestBody.response_format = {
              type: 'json_object',
              schema: validationSchema,
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
          const rawContent = data.choices?.[0]?.message?.content || ''

          // Parse JSON based on output format
          let jsonPayload: any = null
          let jsonValid = false
          let validationPassed = false
          let validationErrors: any = null

          try {
            if (outputFormat === 'json') {
              // Single JSON object
              jsonPayload = JSON.parse(rawContent)
              jsonValid = true
            } else {
              // JSON Lines - parse each line
              const lines = rawContent.split('\n').filter(line => line.trim())
              jsonPayload = lines.map(line => JSON.parse(line))
              jsonValid = true
            }

            // Validate against schema
            if (jsonValid && validationSchema) {
              const validationResult = validateAgainstSchema(
                outputFormat === 'json' ? jsonPayload : rawContent,
                validationSchema,
                outputFormat
              )
              validationPassed = validationResult.valid
              validationErrors = validationResult.errors.length > 0 ? validationResult.errors : null
            } else {
              validationPassed = false
            }
          } catch (parseError) {
            jsonValid = false
            validationPassed = false
            validationErrors = [{
              message: `JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            }]
          }

          // Calculate costs
          const tokensIn = data.usage?.prompt_tokens || 0
          const tokensOut = data.usage?.completion_tokens || 0
          const costIn = tokensIn * model.priceIn
          const costOut = tokensOut * model.priceOut

          // Save output to database with validation results
          await supabaseClient.from('outputs').insert({
            run_id: runId,
            model: `${model.provider}/${model.name}`,
            json_valid: jsonValid,
            json_payload: jsonPayload,
            raw_response: rawContent,
            cost_in: costIn,
            cost_out: costOut,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            execution_time_ms: executionTimeMs,
            error_message: null,
            // v2.0: JSON Schema validation
            output_format: outputFormat,
            validation_schema: validationSchema,
            validation_passed: validationPassed,
            validation_errors: validationErrors,
          })

          return {
            model: model.displayName,
            success: true,
            jsonValid,
            validationPassed,
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
            // v2.0: Null validation for errors
            output_format: outputFormat,
            validation_schema: validationSchema,
            validation_passed: false,
            validation_errors: [{ message: error.message }],
          })

          return {
            model: model.displayName,
            success: false,
            jsonValid: false,
            validationPassed: false,
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
