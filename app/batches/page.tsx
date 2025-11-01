import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import BatchHistoryClient from '@/components/batch/BatchHistoryClient'

export const dynamic = 'force-dynamic'

interface Batch {
  id: string
  name: string
  models_used: string[]
  total_documents: number
  completed_documents: number
  successful_runs: number
  failed_runs: number
  status: string
  created_at: string
  updated_at: string
}

export default async function BatchHistoryPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch batches on the server
  console.log(`📊 Fetching batches for user: ${user.id}`)
  const { data: batches, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  console.log(`📊 Fetched ${batches?.length || 0} batches from database`)

  if (error) {
    console.error('Error fetching batches:', error)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-error-600 dark:text-error-500 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600 dark:text-gray-400">Failed to load batches</p>
        </div>
      </div>
    )
  }

  // Transform batches to match client component interface
  const transformedBatches = (batches || []).map((batch: Batch) => {
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

  return <BatchHistoryClient initialBatches={transformedBatches} />
}
