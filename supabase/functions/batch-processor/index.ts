import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateResponse, getValidationDetails } from '../_shared/enhanced-validator.ts'
import type { OutputFormat } from '../_shared/schema-validator.ts'
import { generateBatchAnalytics } from '../_shared/analytics-generator.ts'
import { countNullValues } from '../_shared/null-counter.ts'

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

// Error categorization helper function
function categorizeApiError(error: Error, status?: number): {
  category: string
  guidance: string[]
  isRetryable: boolean
} {
  const errorMsg = error.message.toLowerCase()

  // Authentication errors (401/403)
  if (status === 401 || status === 403 || errorMsg.includes('authentication') || errorMsg.includes('unauthorized')) {
    return {
      category: 'Authentication Error',
      guidance: [
        '🔐 Authentication Failed: Check your OpenRouter API key',
        'Verify OPENROUTER_API_KEY environment variable is set correctly',
        'Check API key at: https://openrouter.ai/keys'
      ],
      isRetryable: false
    }
  }

  // Rate limiting (429)
  if (status === 429 || errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
    return {
      category: 'Rate Limit',
      guidance: [
        '⏱️ Rate Limit Exceeded: Too many requests',
        'Wait a few moments and try again',
        'Consider upgrading your OpenRouter plan for higher limits'
      ],
      isRetryable: true
    }
  }

  // Timeout errors
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out') || errorMsg.includes('deadline exceeded')) {
    return {
      category: 'Timeout',
      guidance: [
        '⏳ Model Timeout: Request took too long',
        'This model may be slow or overloaded',
        'Try a faster model or reduce input size'
      ],
      isRetryable: true
    }
  }

  // Model not found / invalid model name (404)
  if (status === 404 || errorMsg.includes('model') && (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('invalid model'))) {
    return {
      category: 'Invalid Model Name',
      guidance: [
        '🔍 Model Not Found: Model name does not exist on OpenRouter',
        'Check model name in database matches OpenRouter API format',
        'View available models: https://openrouter.ai/models',
        'Expected format: "provider/model-name" (e.g., "meta-llama/llama-3.3-70b-instruct")'
      ],
      isRetryable: false
    }
  }

  // Model unavailable / overloaded (503)
  if (status === 503 || errorMsg.includes('unavailable') || errorMsg.includes('overloaded') || errorMsg.includes('capacity')) {
    return {
      category: 'Model Unavailable',
      guidance: [
        '🚫 Model Temporarily Unavailable: Model is down or overloaded',
        'This is usually temporary - try again in a few minutes',
        'Try a different model as alternative'
      ],
      isRetryable: true
    }
  }

  // Bad request (400) - Invalid parameters
  if (status === 400) {
    // Check for specific 400 errors
    if (errorMsg.includes('parameter') || errorMsg.includes('invalid')) {
      return {
        category: 'Invalid Request',
        guidance: [
          `❌ Invalid Request Parameters`,
          'This model may not support the requested parameters (e.g., JSON mode)',
          'Try a different model or remove special parameters',
          `Details: ${error.message}`
        ],
        isRetryable: false
      }
    }

    return {
      category: 'Invalid Request',
      guidance: [
        `❌ Bad Request: ${error.message}`,
        'Check request format and model compatibility',
        'Try a different model'
      ],
      isRetryable: false
    }
  }

  // Server errors (500+)
  if (status && status >= 500) {
    return {
      category: 'Server Error',
      guidance: [
        '🔧 Server Error: OpenRouter API is experiencing issues',
        'This is temporary - try again in a few minutes',
        'Check OpenRouter status: https://status.openrouter.ai'
      ],
      isRetryable: true
    }
  }

  // Network errors
  if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('fetch failed')) {
    return {
      category: 'Network Error',
      guidance: [
        '🌐 Network Error: Cannot reach OpenRouter API',
        'Check your internet connection',
        'Verify OpenRouter API is accessible',
        'This may be temporary - try again'
      ],
      isRetryable: true
    }
  }

  // Generic/unknown errors
  return {
    category: 'Unknown Error',
    guidance: [
      `⚠️ Unexpected Error: ${error.message}`,
      'Check Supabase logs for more details',
      'Try a different model',
      'If issue persists, contact support'
    ],
    isRetryable: false
  }
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

    // Parse models configuration with validation
    const models: ModelConfig[] = []
    const invalidModels: string[] = []

    for (const modelStr of batchJob.models_used) {
      // Validate model format (must be "provider/name")
      if (!modelStr || typeof modelStr !== 'string' || !modelStr.includes('/')) {
        console.error(`Invalid model format: "${modelStr}" - expected format "provider/name"`)
        invalidModels.push(modelStr)
        continue
      }

      const parts = modelStr.split('/')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.error(`Invalid model format: "${modelStr}" - must have exactly one "/" separator`)
        invalidModels.push(modelStr)
        continue
      }

      models.push({
        name: parts[1],
        provider: parts[0],
        displayName: modelStr,
        supportsJsonMode: false, // Will be updated from DB
        priceIn: 0,
        priceOut: 0
      })
    }

    // Log validation results
    console.log(`Model validation: ${models.length} valid, ${invalidModels.length} invalid`)
    if (invalidModels.length > 0) {
      console.error('Invalid models:', invalidModels)
    }

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

        // Run models sequentially with progress updates after each
        for (const model of models) {
          const startTime = Date.now()
          const modelIdentifier = `${model.provider}/${model.name}`

          try {
            console.log(`[Model: ${modelIdentifier}] Starting API call for document: ${document.filename}`)

            const requestBody: any = {
              model: modelIdentifier,
              messages,
              temperature: 0.1,
              max_tokens: 4000
            }

            // Add JSON mode if supported (only for 'json' format)
            if (model.supportsJsonMode && outputFormat === 'json') {
              requestBody.response_format = {
                type: 'json_object'
              }
              console.log(`[Model: ${modelIdentifier}] Using JSON mode`)
            }

            console.log(`[Model: ${modelIdentifier}] Request payload:`, {
              model: requestBody.model,
              temperature: requestBody.temperature,
              max_tokens: requestBody.max_tokens,
              hasJsonMode: !!requestBody.response_format
            })

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
              console.error(`[Model: ${modelIdentifier}] API Error`, {
                status: response.status,
                statusText: response.statusText,
                document: document.filename,
                executionTime: executionTimeMs + 'ms',
                errorBody: errorText
              })
              throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
            }

            console.log(`[Model: ${modelIdentifier}] API call successful (${executionTimeMs}ms)`)

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

            // Count null values in the output
            const nullCount = jsonPayload ? countNullValues(jsonPayload) : 0

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
              prompt_guidance: validationResult.guidance,
              // Null value tracking
              null_count: nullCount
            })

            if (validationPassed) successfulRuns++
            else failedRuns++

            // Update progress after each model completes
            try {
              const totalRuns = documents.length * models.length
              const completedRuns = successfulRuns + failedRuns
              await supabaseClient
                .from('batch_jobs')
                .update({
                  successful_runs: successfulRuns,
                  failed_runs: failedRuns,
                  updated_at: new Date().toISOString()
                })
                .eq('id', batchJobId)

              console.log(`[Progress] Run ${completedRuns}/${totalRuns} completed: ${modelIdentifier} - ${validationPassed ? 'success' : 'failed'}`)
            } catch (progressError) {
              console.error('Failed to update run progress (continuing anyway):', progressError)
            }
          } catch (error) {
            const executionTimeMs = Date.now() - startTime
            const modelIdentifier = `${model.provider}/${model.name}`

            // Extract status code from error message if present
            const errorMessage = error instanceof Error ? error.message : String(error)
            const statusMatch = errorMessage.match(/error: (\d{3})/)
            const statusCode = statusMatch ? parseInt(statusMatch[1]) : undefined

            // Categorize the error
            const errorInfo = categorizeApiError(error instanceof Error ? error : new Error(String(error)), statusCode)

            // Log the categorized error with full details
            console.error(`[Model: ${modelIdentifier}] Failed [${errorInfo.category}]`, {
              errorMessage,
              statusCode,
              isRetryable: errorInfo.isRetryable,
              document: document.filename,
              executionTime: executionTimeMs + 'ms'
            })
            console.error(`[Model: ${modelIdentifier}] Guidance:`, errorInfo.guidance)

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
              error_message: `[${errorInfo.category}] ${errorMessage}`,
              output_format: outputFormat,
              validation_schema: validationSchema,
              validation_passed: false,
              validation_errors: [{ message: errorMessage }],
              // 3-level validation fields (all false for API errors)
              attributes_valid: false,
              formats_valid: false,
              validation_details: {
                jsonErrors: [errorMessage],
                missingAttributes: [],
                invalidAttributes: [],
                formatErrors: [],
                errorCategory: errorInfo.category,
                isRetryable: errorInfo.isRetryable
              },
              prompt_guidance: errorInfo.guidance,
              // Null value tracking (0 for errors)
              null_count: 0
            })

            failedRuns++

            // Update progress after each model completes (even on error)
            try {
              const totalRuns = documents.length * models.length
              const completedRuns = successfulRuns + failedRuns
              await supabaseClient
                .from('batch_jobs')
                .update({
                  successful_runs: successfulRuns,
                  failed_runs: failedRuns,
                  updated_at: new Date().toISOString()
                })
                .eq('id', batchJobId)

              console.log(`[Progress] Run ${completedRuns}/${totalRuns} completed: ${modelIdentifier} - failed`)
            } catch (progressError) {
              console.error('Failed to update run progress (continuing anyway):', progressError)
            }
          }
        }

        console.log(`Completed document ${i + 1}/${documents.length}: ${document.filename}`)

        // Update batch progress after completing this document
        try {
          await supabaseClient
            .from('batch_jobs')
            .update({
              completed_documents: i + 1,  // Document just completed
              successful_runs: successfulRuns,  // Current success count
              failed_runs: failedRuns,  // Current failure count
              updated_at: new Date().toISOString()
            })
            .eq('id', batchJobId)

          console.log(`Progress updated: ${i + 1}/${documents.length} docs, ${successfulRuns} success, ${failedRuns} failed`)
        } catch (progressError) {
          console.error('Failed to update batch progress (continuing anyway):', progressError)
          // Don't throw - continue processing remaining documents
        }
      } catch (docError) {
        console.error(`Error processing document ${document.filename}:`, docError)
        failedRuns += models.length
      }
    }

    // Mark batch as completed (with error handling)
    try {
      const { error: batchUpdateError } = await supabaseClient
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

      if (batchUpdateError) {
        console.error('Failed to update batch status to completed:', batchUpdateError)
        // Don't throw - continue to try analytics generation
      } else {
        console.log('Batch marked as completed')
      }
    } catch (err) {
      console.error('Exception updating batch status:', err)
      // Don't throw - continue anyway
    }

    // Generate analytics (with error handling)
    let analytics: any = null
    try {
      console.log('Generating batch analytics...')
      analytics = await generateBatchAnalytics(batchJobId, supabaseClient)
      console.log(`Analytics generated: ${analytics.modelAnalytics.length} models`)
    } catch (analyticsError) {
      console.error('Failed to generate analytics:', analyticsError)
      // Don't throw - batch already completed, analytics is optional
      console.log('Continuing without analytics due to generation error')
    }

    // Save analytics to database with 3-level validation breakdown (with error handling)
    if (analytics && analytics.modelAnalytics) {
      for (const modelAnalytic of analytics.modelAnalytics) {
        try {
          const { error: upsertError } = await supabaseClient.from('batch_analytics').upsert({
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
            validation_breakdown: modelAnalytic.validationBreakdown,
            // Null value tracking
            avg_null_count: modelAnalytic.avgNullCount
          })

          if (upsertError) {
            console.error(`Failed to save analytics for model ${modelAnalytic.model}:`, upsertError)
          }
        } catch (err) {
          console.error(`Exception saving analytics for model ${modelAnalytic.model}:`, err)
          // Continue with next model
        }
      }
    }

    console.log('Batch processing completed successfully')

    // Determine completion status
    const partialSuccess = failedRuns > 0 && successfulRuns > 0
    const allFailed = failedRuns > 0 && successfulRuns === 0
    const statusMessage = allFailed
      ? 'All models failed'
      : partialSuccess
        ? 'Completed with errors'
        : 'Completed successfully'

    console.log(`Final status: ${statusMessage} (${successfulRuns} success, ${failedRuns} failed)`)

    return new Response(
      JSON.stringify({
        success: true,
        batchJobId,
        totalDocuments: documents.length,
        successfulRuns,
        failedRuns,
        modelsAttempted: models.length,
        partialSuccess,
        allFailed,
        statusMessage,
        analytics: analytics ? {
          modelCount: analytics.modelAnalytics.length,
          attributeFailureCount: analytics.attributeFailures.length,
          patternCount: analytics.patterns.length
        } : {
          modelCount: 0,
          attributeFailureCount: 0,
          patternCount: 0
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
