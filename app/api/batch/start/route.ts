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
    const { data, error: functionError } = await supabase.functions.invoke('batch-processor', {
      body: { batchJobId }
    })

    if (functionError) {
      // Check if this is a timeout error
      const isTimeout =
        functionError.context?.status === 504 ||
        functionError.message?.toLowerCase().includes('timeout') ||
        functionError.message?.toLowerCase().includes('504')

      // Log detailed error information
      console.error('Edge Function error:', {
        message: functionError.message,
        context: functionError.context,
        isTimeout,
        details: JSON.stringify(functionError, null, 2)
      })

      // Special handling for timeout - batch may still be processing
      if (isTimeout) {
        console.warn('Edge Function timeout detected - batch processing may continue in background')
        return NextResponse.json(
          {
            error: 'Batch processing started but taking longer than expected',
            details: 'Your batch is still being processed in the background. Status will update automatically.',
            isTimeout: true,
            batchJobId,
            timestamp: new Date().toISOString()
          },
          { status: 202 } // 202 Accepted - processing continues
        )
      }

      // Regular error handling
      return NextResponse.json(
        {
          error: `Batch processing failed: ${functionError.message}`,
          details: functionError.context || 'Check Supabase Edge Function logs for detailed error information',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Log successful invocation
    console.log('Edge Function invoked successfully:', {
      batchJobId,
      response: data
    })

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
