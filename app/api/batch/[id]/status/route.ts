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

    // Fetch batch job
    const { data: batchJob, error: batchError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', batchJobId)
      .eq('user_id', user.id)
      .single()

    if (batchError || !batchJob) {
      return NextResponse.json(
        { error: 'Batch job not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      batchJobId: batchJob.id,
      name: batchJob.name,
      status: batchJob.status,
      totalDocuments: batchJob.total_documents,
      completedDocuments: batchJob.completed_documents,
      successfulRuns: batchJob.successful_runs,
      failedRuns: batchJob.failed_runs,
      currentDocument: batchJob.current_document,
      errorMessage: batchJob.error_message,
      createdAt: batchJob.created_at,
      updatedAt: batchJob.updated_at
    })
  } catch (error) {
    console.error('Error fetching batch status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
