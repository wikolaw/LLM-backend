import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const batchJobId = params.id

    // 1. Fetch batch job details (for prompts and schema)
    const { data: batchJob, error: batchError } = await supabase
      .from('batch_jobs')
      .select('system_prompt, user_prompt, validation_schema, user_id')
      .eq('id', batchJobId)
      .single()

    if (batchError || !batchJob) {
      return NextResponse.json(
        { error: 'Batch job not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (batchJob.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 2. Fetch all runs for this batch
    const { data: runs, error: runsError } = await supabase
      .from('runs')
      .select('id, document_id')
      .eq('batch_job_id', batchJobId)

    if (runsError) {
      return NextResponse.json(
        { error: `Failed to fetch runs: ${runsError.message}` },
        { status: 500 }
      )
    }

    const runIds = runs?.map(r => r.id) || []

    // 3. Fetch all outputs with full details
    const { data: outputs, error: outputsError } = await supabase
      .from('outputs')
      .select('*')
      .in('run_id', runIds)

    if (outputsError) {
      return NextResponse.json(
        { error: `Failed to fetch outputs: ${outputsError.message}` },
        { status: 500 }
      )
    }

    // 4. Fetch document information
    const documentIds = [...new Set(runs?.map(r => r.document_id) || [])]
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, filename')
      .in('id', documentIds)

    if (docsError) {
      return NextResponse.json(
        { error: `Failed to fetch documents: ${docsError.message}` },
        { status: 500 }
      )
    }

    // Build document ID to filename map
    const docMap = new Map(documents?.map(d => [d.id, d.filename]) || [])

    // Build run ID to document ID map
    const runToDocMap = new Map(runs?.map(r => [r.id, r.document_id]) || [])

    // 5. Map outputs to detailed structure
    const detailedOutputs = outputs?.map(output => {
      const documentId = runToDocMap.get(output.run_id)
      const documentFilename = documentId ? docMap.get(documentId) : 'unknown'

      return {
        outputId: output.id,
        model: output.model,
        documentId: documentId || null,
        documentFilename: documentFilename || 'unknown',
        rawResponse: output.raw_response,
        jsonPayload: output.json_payload,
        jsonValid: output.json_valid,
        attributesValid: output.attributes_valid,
        formatsValid: output.formats_valid,
        validationDetails: output.validation_details || {
          jsonErrors: [],
          missingAttributes: [],
          invalidAttributes: [],
          formatErrors: []
        },
        promptGuidance: output.prompt_guidance || [],
        executionTimeMs: output.execution_time_ms,
        tokensIn: output.tokens_in,
        tokensOut: output.tokens_out,
        costIn: output.cost_in ? parseFloat(output.cost_in.toString()) : null,
        costOut: output.cost_out ? parseFloat(output.cost_out.toString()) : null,
        errorMessage: output.error_message,
        validationPassed: output.validation_passed
      }
    }) || []

    return NextResponse.json({
      batchJob: {
        systemPrompt: batchJob.system_prompt,
        userPrompt: batchJob.user_prompt,
        validationSchema: batchJob.validation_schema
      },
      outputs: detailedOutputs
    })
  } catch (error) {
    console.error('Error fetching detailed outputs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
