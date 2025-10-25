import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      documentIds,
      name,
      systemPrompt,
      userPrompt,
      outputFormat,
      validationSchema,
      models
    } = body

    // Validate required fields
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'documentIds array is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!systemPrompt || !userPrompt || !outputFormat || !validationSchema || !models) {
      return NextResponse.json(
        { error: 'Missing required fields: systemPrompt, userPrompt, outputFormat, validationSchema, models' },
        { status: 400 }
      )
    }

    if (!['json', 'jsonl'].includes(outputFormat)) {
      return NextResponse.json(
        { error: 'outputFormat must be "json" or "jsonl"' },
        { status: 400 }
      )
    }

    if (!Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { error: 'models array is required' },
        { status: 400 }
      )
    }

    // Verify all documents belong to the user
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, user_id')
      .in('id', documentIds)

    if (docsError) {
      return NextResponse.json(
        { error: `Failed to verify documents: ${docsError.message}` },
        { status: 400 }
      )
    }

    if (!documents || documents.length !== documentIds.length) {
      return NextResponse.json(
        { error: 'Some documents not found' },
        { status: 404 }
      )
    }

    const unauthorizedDocs = documents.filter(doc => doc.user_id !== user.id)
    if (unauthorizedDocs.length > 0) {
      return NextResponse.json(
        { error: 'Some documents do not belong to you' },
        { status: 403 }
      )
    }

    // Create batch job
    const { data: batchJob, error: batchError } = await supabase
      .from('batch_jobs')
      .insert({
        user_id: user.id,
        name,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        output_format: outputFormat,
        validation_schema: validationSchema,
        models_used: models,
        total_documents: documentIds.length,
        status: 'pending'
      })
      .select()
      .single()

    if (batchError || !batchJob) {
      return NextResponse.json(
        { error: `Failed to create batch job: ${batchError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Create run records for each document (linked to batch)
    // This allows the batch processor to find all documents for this batch
    const runInserts = documentIds.map(docId => ({
      document_id: docId,
      batch_job_id: batchJob.id,
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      prompt_hash: `batch-${batchJob.id}-${docId}`,
      models_used: models
    }))

    const { error: runsError } = await supabase
      .from('runs')
      .insert(runInserts)

    if (runsError) {
      // Rollback: delete batch job
      await supabase.from('batch_jobs').delete().eq('id', batchJob.id)
      return NextResponse.json(
        { error: `Failed to create run records: ${runsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      totalDocuments: documentIds.length,
      status: 'pending'
    })
  } catch (error) {
    console.error('Error creating batch job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
