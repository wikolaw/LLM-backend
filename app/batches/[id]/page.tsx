import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BatchResults } from '@/components/results/BatchResults'
import BatchActions from '@/components/batch/BatchActions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

export default async function BatchDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch batch job details
  const { data: batchJob, error: batchError } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (batchError || !batchJob) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-error-600 dark:text-error-500 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Batch not found</p>
          <Link
            href="/batches"
            className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 inline-block transition-colors shadow-sm"
          >
            Return to Batches
          </Link>
        </div>
      </div>
    )
  }

  // Fetch analytics (may be empty if batch hasn't completed yet)
  const { data: analytics, error: analyticsError } = await supabase
    .from('batch_analytics')
    .select('*')
    .eq('batch_job_id', params.id)

  // Analytics are optional - batch may not have completed processing yet
  const hasAnalytics = !analyticsError && analytics && analytics.length > 0

  // Transform analytics data only if available
  let batchAnalytics = null
  if (hasAnalytics) {
    const modelAnalytics = analytics.map((a) => ({
      model: a.model,
      successCount: a.success_count || 0,
      failureCount: a.failure_count || 0,
      successRate: a.success_count / (a.success_count + a.failure_count),
      avgExecutionTime: a.avg_execution_time_ms || 0,
      totalCost: a.total_cost || 0,
      commonErrors: a.common_errors || [],
      jsonValidityRate: a.json_validity_rate || undefined,
      attributeValidityRate: a.attribute_validity_rate || undefined,
      formatValidityRate: a.format_validity_rate || undefined,
      validationBreakdown: a.validation_breakdown || undefined,
    }))

    // Fetch document results
    const { data: runs } = await supabase
      .from('runs')
      .select('document_id, validation_passed, documents(filename)')
      .eq('batch_job_id', params.id)

    const documentMap = new Map<string, { passed: number; total: number; filename: string }>()
    runs?.forEach((run: any) => {
      const docId = run.document_id
      if (!documentMap.has(docId)) {
        documentMap.set(docId, {
          passed: 0,
          total: 0,
          filename: run.documents?.filename || 'Unknown',
        })
      }
      const doc = documentMap.get(docId)!
      doc.total++
      if (run.validation_passed) doc.passed++
    })

    const documentResults = Array.from(documentMap.entries()).map(([docId, data]) => ({
      documentId: docId,
      filename: data.filename,
      modelsPassedCount: data.passed,
      modelsTotalCount: data.total,
      status:
        data.passed === data.total
          ? ('all_passed' as const)
          : data.passed === 0
          ? ('all_failed' as const)
          : ('partial' as const),
    }))

    batchAnalytics = {
      modelAnalytics,
      documentResults,
      attributeFailures: [], // Would need to compute from runs if needed
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/batches"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {batchJob.name || 'Untitled Batch'}
              </h1>
              <BatchActions
                batchId={batchJob.id}
                batchName={batchJob.name || 'Untitled Batch'}
                status={batchJob.status}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    batchJob.status === 'completed'
                      ? 'bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-100'
                      : batchJob.status === 'processing'
                      ? 'bg-primary-100 dark:bg-primary-950/30 text-primary-800 dark:text-primary-100'
                      : batchJob.status === 'failed'
                      ? 'bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {batchJob.status}
                </span>
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(batchJob.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Documents:</span> {batchJob.total_documents}
              </div>
              <div>
                <span className="font-medium">Models:</span> {batchJob.models_used?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {hasAnalytics && batchAnalytics ? (
          <BatchResults
            analytics={batchAnalytics}
            batchJobName={batchJob.name || 'Untitled Batch'}
            batchJobId={batchJob.id}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Analytics Not Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {batchJob.status === 'completed'
                ? 'Analytics are being generated. Please refresh in a moment.'
                : batchJob.status === 'processing'
                ? 'This batch is still processing. Analytics will be available when complete.'
                : 'This batch has not completed processing yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
