import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const batchId = params.id

    // Fetch batch job configuration
    const { data: batch, error: batchError } = await supabase
      .from('batch_jobs')
      .select(
        `
        id,
        name,
        original_user_input,
        system_prompt,
        user_prompt,
        output_format,
        validation_schema,
        models_used,
        created_at
      `
      )
      .eq('id', batchId)
      .eq('user_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch associated documents
    const { data: runs, error: runsError } = await supabase
      .from('runs')
      .select('document_id')
      .eq('batch_job_id', batchId)
      .not('document_id', 'is', null)

    if (runsError) {
      console.error('Error fetching runs:', runsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${runs?.length || 0} runs for batch ${batchId}`)

    // Get unique document IDs
    const documentIds = [
      ...new Set(runs.map((run) => run.document_id).filter(Boolean)),
    ]

    console.log(`📄 Unique document IDs: ${documentIds.length}`, documentIds)

    // Fetch document details
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, filename, storage_path, full_text, char_count')
      .in('id', documentIds)
      .eq('user_id', user.id)

    console.log(`📦 Fetched ${documents?.length || 0} documents`)

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return NextResponse.json(
        { error: 'Failed to fetch document details' },
        { status: 500 }
      )
    }

    // Return batch configuration
    const response = {
      id: batch.id,
      name: batch.name,
      originalUserInput: batch.original_user_input,
      systemPrompt: batch.system_prompt,
      userPrompt: batch.user_prompt,
      outputFormat: batch.output_format,
      validationSchema: batch.validation_schema,
      modelsUsed: batch.models_used,
      documents: documents || [],
      createdAt: batch.created_at,
    }

    console.log(`✅ Returning batch config:`, {
      name: response.name,
      documentsCount: response.documents.length,
      modelsCount: response.modelsUsed?.length || 0,
      hasSystemPrompt: !!response.systemPrompt,
      hasUserPrompt: !!response.userPrompt,
      hasValidationSchema: !!response.validationSchema,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching batch config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
