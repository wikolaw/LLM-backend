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

    // Fetch batch analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('batch_analytics')
      .select('*')
      .eq('batch_job_id', batchJobId)

    if (analyticsError) {
      return NextResponse.json(
        { error: `Failed to fetch analytics: ${analyticsError.message}` },
        { status: 500 }
      )
    }

    // Fetch all runs for this batch
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

    // Fetch all outputs for these runs
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

    // Fetch document info
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

    // Build per-document results
    const documentResults = documentIds.map(docId => {
      const docRuns = runs?.filter(r => r.document_id === docId) || []
      const docRunIds = docRuns.map(r => r.id)
      const docOutputs = outputs?.filter(o => docRunIds.includes(o.run_id)) || []
      const passedCount = docOutputs.filter(o => o.validation_passed).length
      const totalCount = docOutputs.length

      let status: 'all_passed' | 'partial' | 'all_failed'
      if (passedCount === totalCount && totalCount > 0) status = 'all_passed'
      else if (passedCount === 0) status = 'all_failed'
      else status = 'partial'

      return {
        documentId: docId,
        filename: docMap.get(docId) || 'unknown',
        modelsPassedCount: passedCount,
        modelsTotalCount: totalCount,
        status
      }
    })

    // Build attribute failures from analytics
    const attributeFailuresMap = new Map<string, {
      missing: number
      typeMismatch: number
      formatViolation: number
      affectedModels: Set<string>
    }>()

    for (const analytic of analytics || []) {
      const failures = analytic.attribute_failures as Record<string, any> || {}
      for (const [attrPath, counts] of Object.entries(failures)) {
        if (!attributeFailuresMap.has(attrPath)) {
          attributeFailuresMap.set(attrPath, {
            missing: 0,
            typeMismatch: 0,
            formatViolation: 0,
            affectedModels: new Set()
          })
        }
        const attr = attributeFailuresMap.get(attrPath)!
        attr.missing += counts.missing || 0
        attr.typeMismatch += counts.type_mismatch || 0
        attr.formatViolation += counts.format_violation || 0
        attr.affectedModels.add(analytic.model)
      }
    }

    const attributeFailures = Array.from(attributeFailuresMap.entries()).map(([path, data]) => {
      const totalModels = new Set(analytics?.map(a => a.model)).size
      let pattern = ''

      if (data.affectedModels.size === totalModels) {
        pattern = `All ${totalModels} models fail - attribute may be missing or vague`
      } else if (data.typeMismatch > data.missing) {
        pattern = 'Type mismatch common - clarify expected type in prompt'
      } else if (data.missing > 0) {
        pattern = 'Missing in some documents - may not exist in all sources'
      }

      return {
        attributePath: path,
        missingCount: data.missing,
        typeMismatchCount: data.typeMismatch,
        formatViolationCount: data.formatViolation,
        affectedModels: Array.from(data.affectedModels),
        pattern
      }
    }).sort((a, b) =>
      (b.missingCount + b.typeMismatchCount + b.formatViolationCount) -
      (a.missingCount + a.typeMismatchCount + a.formatViolationCount)
    )

    return NextResponse.json({
      modelAnalytics: (analytics || []).map(a => ({
        model: a.model,
        successCount: a.success_count,
        failureCount: a.failure_count,
        successRate: a.success_count + a.failure_count > 0
          ? a.success_count / (a.success_count + a.failure_count)
          : 0,
        avgExecutionTime: a.avg_execution_time_ms,
        totalCost: parseFloat(a.total_cost?.toString() || '0'),
        commonErrors: a.common_errors as any[] || [],
        jsonValidityRate: a.json_validity_rate ? parseFloat(a.json_validity_rate.toString()) : undefined,
        attributeValidityRate: a.attribute_validity_rate ? parseFloat(a.attribute_validity_rate.toString()) : undefined,
        formatValidityRate: a.format_validity_rate ? parseFloat(a.format_validity_rate.toString()) : undefined,
        validationBreakdown: a.validation_breakdown as any,
        // Null value tracking
        avgNullCount: a.avg_null_count !== null && a.avg_null_count !== undefined ? parseFloat(a.avg_null_count.toString()) : undefined,
        totalNullCount: a.total_null_count || 0
      })),
      documentResults,
      attributeFailures
    })
  } catch (error) {
    console.error('Error fetching batch analytics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
