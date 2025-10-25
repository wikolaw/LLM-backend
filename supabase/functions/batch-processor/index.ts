import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateResponse, getValidationDetails } from '../_shared/enhanced-validator.ts'
import type { OutputFormat } from '../_shared/schema-validator.ts'
import { generateBatchAnalytics } from '../_shared/analytics-generator.ts'

interface BatchProcessorRequest {
  batchJobId: string
}

interface ModelConfig {
  name: string
  provider: string
  displayName: string
  supportsJsonMode: boolean
  priceIn: number
  priceOut: number
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

    const { batchJobId }: BatchProcessorRequest = await req.json()

    // Fetch batch job details
    const { data: batchJob, error: batchError } = await supabaseClient
      .from('batch_jobs')
      .select('*')
      .eq('id', batchJobId)
      .single()

    if (batchError || !batchJob) {
      throw new Error('Batch job not found')
    }

    // Update status to processing
    await supabaseClient
      .from('batch_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', batchJobId)

    // Fetch all documents for this batch (via runs)
    const { data: existingRuns, error: runsError } = await supabaseClient
      .from('runs')
      .select('document_id')
      .eq('batch_job_id', batchJobId)

    if (runsError) throw runsError

    const documentIds = existingRuns?.map((r: any) => r.document_id) || []

    if (documentIds.length === 0) {
      throw new Error('No documents found for this batch')
    }

    // Fetch document details
    const { data: documents, error: docsError } = await supabaseClient
      .from('documents')
      .select('id, filename, full_text')
      .in('id', documentIds)

    if (docsError || !documents) {
      throw new Error('Failed to fetch documents')
    }

    // Parse models configuration
    const models: ModelConfig[] = batchJob.models_used.map((modelStr: string) => {
      // Fetch model details from database
      return {
        name: modelStr.split('/')[1],
        provider: modelStr.split('/')[0],
        displayName: modelStr,
        supportsJsonMode: false, // Will be updated from DB
        priceIn: 0,
        priceOut: 0
      }
    })

    // Fetch model pricing from database
    for (const model of models) {
      const { data: modelData } = await supabaseClient
        .from('models')
        .select('*')
        .eq('provider', model.provider)
        .eq('name', model.name)
        .single()

      if (modelData) {
        model.supportsJsonMode = modelData.supports_json_mode
        model.priceIn = parseFloat(modelData.price_in.toString())
        model.priceOut = parseFloat(modelData.price_out.toString())
        model.displayName = modelData.display_name
      }
    }

    const systemPrompt = batchJob.system_prompt
    const userPrompt = batchJob.user_prompt
    const outputFormat: OutputFormat = batchJob.output_format as OutputFormat
    const validationSchema = batchJob.validation_schema

    let successfulRuns = 0
    let failedRuns = 0

    // Process each document sequentially
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i]

      // Update current document in batch job
      await supabaseClient
        .from('batch_jobs')
        .update({
          current_document: document.filename,
          completed_documents: i,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchJobId)

      try {
        // Create run record for this document
        const { data: run, error: runCreateError } = await supabaseClient
          .from('runs')
          .insert({
            document_id: document.id,
            batch_job_id: batchJobId,
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            prompt_hash: `${Date.now()}-${document.id}`,
            models_used: models.map(m => `${m.provider}/${m.name}`)
          })
          .select()
          .single()

        if (runCreateError || !run) {
          console.error('Failed to create run:', runCreateError)
          failedRuns += models.length
          continue
        }

        const runId = run.id
        const documentText = (document.full_text || '').substring(0, 20000) // Limit to 20K chars
        const finalUserPrompt = `${userPrompt}\n\nDocument text:\n${documentText}`

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: finalUserPrompt }
        ]

        // Run all models for this document in parallel
        const modelResults = await Promise.all(
          models.map(async (model) => {
            const startTime = Date.now()

            try {
              const requestBody: any = {
                model: `${model.provider}/${model.name}`,
                messages,
                temperature: 0.1,
                max_tokens: 4000
              }

              // Add JSON mode if supported (only for 'json' format)
              if (model.supportsJsonMode && outputFormat === 'json') {
                requestBody.response_format = {
                  type: 'json_object'
                }
              }

              const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openRouterApiKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': Deno.env.get('APP_URL') || 'https://llm-analysis.com',
                  'X-Title': 'LLM Document Analysis'
                },
                body: JSON.stringify(requestBody)
              })

              const executionTimeMs = Date.now() - startTime

              if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
              }

              const data = await response.json()
              const rawContent = data.choices?.[0]?.message?.content || ''

              // Perform 3-level enhanced validation
              const validationResult = validateResponse(
                rawContent,
                validationSchema || {},
                outputFormat
              )

              const jsonPayload = validationResult.parsedData
              const jsonValid = validationResult.jsonValid
              const validationPassed = validationResult.validationPassed
              const validationErrors = validationResult.validationPassed ? null : getValidationDetails(validationResult)

              // Calculate costs
              const tokensIn = data.usage?.prompt_tokens || 0
              const tokensOut = data.usage?.completion_tokens || 0
              const costIn = tokensIn * model.priceIn
              const costOut = tokensOut * model.priceOut

              // Save output to database with 3-level validation tracking
              await supabaseClient.from('outputs').insert({
                run_id: runId,
                model: `${model.provider}/${model.name}`,
                json_valid: validationResult.jsonValid,
                json_payload: jsonPayload,
                raw_response: rawContent,
                cost_in: costIn,
                cost_out: costOut,
                tokens_in: tokensIn,
                tokens_out: tokensOut,
                execution_time_ms: executionTimeMs,
                error_message: null,
                output_format: outputFormat,
                validation_schema: validationSchema,
                validation_passed: validationPassed,
                validation_errors: validationErrors,
                // 3-level validation fields
                attributes_valid: validationResult.attributesValid,
                formats_valid: validationResult.formatsValid,
                validation_details: getValidationDetails(validationResult),
                prompt_guidance: validationResult.guidance
              })

              if (validationPassed) successfulRuns++
              else failedRuns++

              return { success: true, validationPassed }
            } catch (error) {
              const executionTimeMs = Date.now() - startTime

              // Save error to database with 3-level validation (all false for errors)
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
                error_message: error instanceof Error ? error.message : String(error),
                output_format: outputFormat,
                validation_schema: validationSchema,
                validation_passed: false,
                validation_errors: [{ message: error instanceof Error ? error.message : String(error) }],
                // 3-level validation fields (all false for API errors)
                attributes_valid: false,
                formats_valid: false,
                validation_details: {
                  jsonErrors: [error instanceof Error ? error.message : String(error)],
                  missingAttributes: [],
                  invalidAttributes: [],
                  formatErrors: []
                },
                prompt_guidance: ['❌ API Error: The model failed to respond. Try a different model or check API connectivity.']
              })

              failedRuns++

              return { success: false, error: error instanceof Error ? error.message : String(error) }
            }
          })
        )

        console.log(`Completed document ${i + 1}/${documents.length}: ${document.filename}`)
      } catch (docError) {
        console.error(`Error processing document ${document.filename}:`, docError)
        failedRuns += models.length
      }
    }

    // Mark batch as completed
    await supabaseClient
      .from('batch_jobs')
      .update({
        status: 'completed',
        completed_documents: documents.length,
        successful_runs: successfulRuns,
        failed_runs: failedRuns,
        current_document: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchJobId)

    // Generate analytics
    console.log('Generating batch analytics...')
    const analytics = await generateBatchAnalytics(batchJobId, supabaseClient)

    // Save analytics to database with 3-level validation breakdown
    for (const modelAnalytic of analytics.modelAnalytics) {
      await supabaseClient.from('batch_analytics').upsert({
        batch_job_id: batchJobId,
        model: modelAnalytic.model,
        success_count: modelAnalytic.successCount,
        failure_count: modelAnalytic.failureCount,
        avg_execution_time_ms: modelAnalytic.avgExecutionTime,
        total_cost: modelAnalytic.totalCost,
        attribute_failures: modelAnalytic.attributeFailures,
        common_errors: modelAnalytic.commonErrors,
        // 3-level validation breakdown
        json_validity_rate: modelAnalytic.jsonValidityRate,
        attribute_validity_rate: modelAnalytic.attributeValidityRate,
        format_validity_rate: modelAnalytic.formatValidityRate,
        validation_breakdown: modelAnalytic.validationBreakdown
      })
    }

    console.log('Batch processing completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        batchJobId,
        totalDocuments: documents.length,
        successfulRuns,
        failedRuns,
        analytics: {
          modelCount: analytics.modelAnalytics.length,
          attributeFailureCount: analytics.attributeFailures.length,
          patternCount: analytics.patterns.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Batch processor error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
