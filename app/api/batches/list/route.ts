import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all batch jobs for the user, ordered by most recent first
    const { data: batches, error } = await supabase
      .from('batch_jobs')
      .select(
        `
        id,
        name,
        models_used,
        total_documents,
        completed_documents,
        successful_runs,
        failed_runs,
        status,
        created_at,
        updated_at
      `
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching batches:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate success rate for each batch
    const batchesWithStats = batches.map((batch) => {
      const totalRuns = (batch.successful_runs || 0) + (batch.failed_runs || 0)
      const successRate = totalRuns > 0 ? ((batch.successful_runs || 0) / totalRuns) * 100 : 0

      return {
        id: batch.id,
        name: batch.name,
        modelsUsed: batch.models_used || [],
        totalDocuments: batch.total_documents || 0,
        completedDocuments: batch.completed_documents || 0,
        successfulRuns: batch.successful_runs || 0,
        failedRuns: batch.failed_runs || 0,
        successRate: Math.round(successRate),
        status: batch.status,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
      }
    })

    return NextResponse.json({ batches: batchesWithStats })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
