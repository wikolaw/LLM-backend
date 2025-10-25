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
    const { batchJobId } = body

    if (!batchJobId) {
      return NextResponse.json(
        { error: 'batchJobId is required' },
        { status: 400 }
      )
    }

    // Verify batch job exists and belongs to user
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

    if (batchJob.status !== 'pending') {
      return NextResponse.json(
        { error: `Batch job is already ${batchJob.status}` },
        { status: 400 }
      )
    }

    // Call the batch-processor Edge Function asynchronously
    // Note: We don't await this - it runs in the background
    const { error: functionError } = await supabase.functions.invoke('batch-processor', {
      body: { batchJobId }
    })

    if (functionError) {
      return NextResponse.json(
        { error: `Failed to start batch processing: ${functionError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      batchJobId,
      message: 'Batch processing started'
    })
  } catch (error) {
    console.error('Error starting batch processing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
