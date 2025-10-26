/**
 * Analytics Generator for Batch Processing
 *
 * Analyzes validation errors from LLM outputs to generate:
 * - Attribute-level failure tracking
 * - Pattern detection across models and documents
 * - Human-readable insights for improving prompts/schemas
 */

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  instancePath: string // e.g., "/contract_name" or "/parties/supplier_name"
  message: string // e.g., "must be string", "is required"
  keyword?: string // e.g., "required", "type", "format"
  params?: Record<string, any>
}

export interface Output {
  id: string
  run_id: string
  model: string
  validation_passed: boolean | null
  validation_errors: ValidationError[] | null
  execution_time_ms: number | null
  cost_in: number | null
  cost_out: number | null
  tokens_in: number | null
  tokens_out: number | null
  // 3-level validation fields
  json_valid: boolean | null
  attributes_valid: boolean | null
  formats_valid: boolean | null
  validation_details: any | null
  prompt_guidance: string[] | null
}

export interface Run {
  id: string
  document_id: string
}

export interface Document {
  id: string
  filename: string
}

export interface AttributeFailure {
  attributePath: string // e.g., "contract_name" or "parties.supplier_name"
  missingCount: number
  typeMismatchCount: number
  formatViolationCount: number
  totalFailures: number
  affectedModels: string[]
  affectedDocuments: string[]
}

export interface ModelAnalytics {
  model: string
  successCount: number
  failureCount: number
  successRate: number
  avgExecutionTime: number
  totalCost: number
  commonErrors: Array<{
    error: string
    count: number
    documents: string[]
  }>
  attributeFailures: Record<string, {
    missing: number
    type_mismatch: number
    format_violation: number
  }>
  // 3-level validation breakdown
  jsonValidityRate: number
  attributeValidityRate: number
  formatValidityRate: number
  validationBreakdown: {
    totalRuns: number
    jsonValid: number
    attributesValid: number
    formatsValid: number
    commonGuidance: string[]
  }
}

export interface Pattern {
  type: 'universal_failure' | 'model_specific' | 'document_specific' | 'type_issue'
  severity: 'high' | 'medium' | 'low'
  message: string
  affectedItems: string[] // model names, document names, or attribute paths
}

// ============================================================================
// Error Categorization
// ============================================================================

/**
 * Categorize a validation error into missing, type_mismatch, or format_violation
 */
export function categorizeError(error: ValidationError): {
  attributePath: string
  errorType: 'missing' | 'type_mismatch' | 'format_violation' | 'unknown'
} {
  const path = error.instancePath || ''
  const message = error.message.toLowerCase()
  const keyword = error.keyword?.toLowerCase()

  // Remove leading slash from path
  const cleanPath = path.startsWith('/') ? path.slice(1).replace(/\//g, '.') : path

  // Categorize based on keyword first, then message
  if (keyword === 'required' || message.includes('required') || message.includes('missing property')) {
    return { attributePath: cleanPath, errorType: 'missing' }
  }

  if (keyword === 'type' || message.includes('must be') || message.includes('should be')) {
    return { attributePath: cleanPath, errorType: 'type_mismatch' }
  }

  if (keyword === 'format' || message.includes('format') || message.includes('pattern')) {
    return { attributePath: cleanPath, errorType: 'format_violation' }
  }

  return { attributePath: cleanPath, errorType: 'unknown' }
}

// ============================================================================
// Attribute Failure Analysis
// ============================================================================

/**
 * Analyze all outputs to identify attribute-level failures
 */
export function analyzeAttributeFailures(
  outputs: Output[],
  runs: Run[],
  documents: Document[]
): AttributeFailure[] {
  const failureMap = new Map<string, {
    missing: number
    type_mismatch: number
    format_violation: number
    models: Set<string>
    documents: Set<string>
  }>()

  // Build document ID to filename map
  const docMap = new Map(documents.map(d => [d.id, d.filename]))

  // Build run ID to document filename map
  const runToDocMap = new Map(
    runs.map(r => [r.id, docMap.get(r.document_id) || 'unknown'])
  )

  // Process each output's validation errors
  for (const output of outputs) {
    if (!output.validation_passed && output.validation_errors) {
      const docFilename = runToDocMap.get(output.run_id) || 'unknown'

      for (const error of output.validation_errors) {
        const { attributePath, errorType } = categorizeError(error)

        if (!failureMap.has(attributePath)) {
          failureMap.set(attributePath, {
            missing: 0,
            type_mismatch: 0,
            format_violation: 0,
            models: new Set(),
            documents: new Set()
          })
        }

        const failure = failureMap.get(attributePath)!

        if (errorType === 'missing') failure.missing++
        else if (errorType === 'type_mismatch') failure.type_mismatch++
        else if (errorType === 'format_violation') failure.format_violation++

        failure.models.add(output.model)
        failure.documents.add(docFilename)
      }
    }
  }

  // Convert map to array
  const failures: AttributeFailure[] = []
  for (const [path, data] of failureMap.entries()) {
    failures.push({
      attributePath: path,
      missingCount: data.missing,
      typeMismatchCount: data.type_mismatch,
      formatViolationCount: data.format_violation,
      totalFailures: data.missing + data.type_mismatch + data.format_violation,
      affectedModels: Array.from(data.models),
      affectedDocuments: Array.from(data.documents)
    })
  }

  // Sort by total failures descending
  return failures.sort((a, b) => b.totalFailures - a.totalFailures)
}

// ============================================================================
// Per-Model Analytics
// ============================================================================

/**
 * Calculate analytics for a specific model
 */
export function calculateModelAnalytics(
  model: string,
  outputs: Output[],
  runs: Run[],
  documents: Document[]
): ModelAnalytics {
  const modelOutputs = outputs.filter(o => o.model === model)
  const successCount = modelOutputs.filter(o => o.validation_passed).length
  const failureCount = modelOutputs.length - successCount

  // Calculate average execution time
  const executionTimes = modelOutputs
    .map(o => o.execution_time_ms)
    .filter((t): t is number => t !== null)
  const avgExecutionTime = executionTimes.length > 0
    ? Math.round(executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length)
    : 0

  // Calculate total cost
  const totalCost = modelOutputs.reduce((sum, o) => {
    const costIn = o.cost_in || 0
    const costOut = o.cost_out || 0
    return sum + costIn + costOut
  }, 0)

  // Extract common errors
  const errorMap = new Map<string, { count: number, documents: Set<string> }>()
  const docMap = new Map(documents.map(d => [d.id, d.filename]))
  const runToDocMap = new Map(runs.map(r => [r.id, docMap.get(r.document_id) || 'unknown']))

  for (const output of modelOutputs) {
    if (!output.validation_passed && output.validation_errors) {
      const docFilename = runToDocMap.get(output.run_id) || 'unknown'

      for (const error of output.validation_errors) {
        const errorKey = error.message
        if (!errorMap.has(errorKey)) {
          errorMap.set(errorKey, { count: 0, documents: new Set() })
        }
        const errorData = errorMap.get(errorKey)!
        errorData.count++
        errorData.documents.add(docFilename)
      }
    }
  }

  const commonErrors = Array.from(errorMap.entries())
    .map(([error, data]) => ({
      error,
      count: data.count,
      documents: Array.from(data.documents)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 errors

  // Build attribute failures map for this model
  const attributeFailures: Record<string, { missing: number, type_mismatch: number, format_violation: number }> = {}

  for (const output of modelOutputs) {
    if (!output.validation_passed && output.validation_errors) {
      for (const error of output.validation_errors) {
        const { attributePath, errorType } = categorizeError(error)

        if (!attributeFailures[attributePath]) {
          attributeFailures[attributePath] = { missing: 0, type_mismatch: 0, format_violation: 0 }
        }

        if (errorType === 'missing') attributeFailures[attributePath].missing++
        else if (errorType === 'type_mismatch') attributeFailures[attributePath].type_mismatch++
        else if (errorType === 'format_violation') attributeFailures[attributePath].format_violation++
      }
    }
  }

  // Calculate 3-level validation breakdown
  const totalRuns = modelOutputs.length
  const jsonValidCount = modelOutputs.filter(o => o.json_valid === true).length
  const attributesValidCount = modelOutputs.filter(o => o.attributes_valid === true).length
  const formatsValidCount = modelOutputs.filter(o => o.formats_valid === true).length

  // Collect all guidance messages and count frequency
  const guidanceMap = new Map<string, number>()
  for (const output of modelOutputs) {
    if (output.prompt_guidance && Array.isArray(output.prompt_guidance)) {
      for (const guidance of output.prompt_guidance) {
        guidanceMap.set(guidance, (guidanceMap.get(guidance) || 0) + 1)
      }
    }
  }

  // Get top 5 most common guidance messages
  const commonGuidance = Array.from(guidanceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([msg, count]) => count > 1 ? `${msg} (${count}× occurrences)` : msg)

  const jsonValidityRate = totalRuns > 0 ? Math.round((jsonValidCount / totalRuns) * 100) : 0
  const attributeValidityRate = totalRuns > 0 ? Math.round((attributesValidCount / totalRuns) * 100) : 0
  const formatValidityRate = totalRuns > 0 ? Math.round((formatsValidCount / totalRuns) * 100) : 0

  return {
    model,
    successCount,
    failureCount,
    successRate: modelOutputs.length > 0 ? successCount / modelOutputs.length : 0,
    avgExecutionTime,
    totalCost,
    commonErrors,
    attributeFailures,
    // 3-level validation breakdown
    jsonValidityRate,
    attributeValidityRate,
    formatValidityRate,
    validationBreakdown: {
      totalRuns,
      jsonValid: jsonValidCount,
      attributesValid: attributesValidCount,
      formatsValid: formatsValidCount,
      commonGuidance
    }
  }
}

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Detect patterns in failures and generate insights
 */
export function detectPatterns(
  attributeFailures: AttributeFailure[],
  modelAnalytics: ModelAnalytics[],
  totalModels: number,
  totalDocuments: number
): Pattern[] {
  const patterns: Pattern[] = []

  // Pattern 1: Universal failures (all models fail on same attribute)
  const universalFailures = attributeFailures.filter(
    f => f.affectedModels.length === totalModels
  )
  for (const failure of universalFailures) {
    patterns.push({
      type: 'universal_failure',
      severity: 'high',
      message: `All ${totalModels} models fail to extract '${failure.attributePath}' - attribute may be vague, incorrectly defined in schema, or missing from documents`,
      affectedItems: [failure.attributePath]
    })
  }

  // Pattern 2: Model-specific weaknesses (model fails on many attributes)
  for (const analytics of modelAnalytics) {
    const failureCount = Object.keys(analytics.attributeFailures).length
    if (failureCount >= 5) {
      patterns.push({
        type: 'model_specific',
        severity: 'medium',
        message: `${analytics.model} struggles with ${failureCount} different attributes (${Math.round(analytics.successRate * 100)}% success rate) - may need better prompting or different model`,
        affectedItems: [analytics.model]
      })
    }
  }

  // Pattern 3: Document-wide issues (attribute fails in most documents)
  for (const failure of attributeFailures) {
    const documentFailureRate = failure.affectedDocuments.length / totalDocuments
    if (documentFailureRate >= 0.7 && failure.missingCount > failure.typeMismatchCount) {
      patterns.push({
        type: 'document_specific',
        severity: 'high',
        message: `'${failure.attributePath}' is missing in ${Math.round(documentFailureRate * 100)}% of documents (${failure.affectedDocuments.length}/${totalDocuments}) - attribute may not exist in source documents`,
        affectedItems: failure.affectedDocuments
      })
    }
  }

  // Pattern 4: Type issues (more type mismatches than missing)
  for (const failure of attributeFailures) {
    if (failure.typeMismatchCount > failure.missingCount && failure.typeMismatchCount >= 3) {
      patterns.push({
        type: 'type_issue',
        severity: 'medium',
        message: `'${failure.attributePath}' frequently extracted with wrong type (${failure.typeMismatchCount} type errors) - clarify expected data type in prompt or schema`,
        affectedItems: [failure.attributePath]
      })
    }
  }

  // Pattern 5: Format violations
  for (const failure of attributeFailures) {
    if (failure.formatViolationCount >= 3) {
      patterns.push({
        type: 'type_issue',
        severity: 'low',
        message: `'${failure.attributePath}' has ${failure.formatViolationCount} format violations - specify exact format in prompt (e.g., "YYYY-MM-DD" for dates)`,
        affectedItems: [failure.attributePath]
      })
    }
  }

  // Sort patterns by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  return patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

// ============================================================================
// Main Analytics Generation Function
// ============================================================================

/**
 * Generate comprehensive analytics for a batch job
 */
export async function generateBatchAnalytics(
  batchJobId: string,
  supabaseClient: any // SupabaseClient type
): Promise<{
  modelAnalytics: ModelAnalytics[]
  attributeFailures: AttributeFailure[]
  patterns: Pattern[]
}> {
  // Fetch all runs for this batch
  const { data: runs, error: runsError } = await supabaseClient
    .from('runs')
    .select('id, document_id')
    .eq('batch_job_id', batchJobId)

  if (runsError) throw runsError
  if (!runs || runs.length === 0) {
    return { modelAnalytics: [], attributeFailures: [], patterns: [] }
  }

  const runIds = runs.map((r: Run) => r.id)

  // Fetch all outputs for these runs
  const { data: outputs, error: outputsError } = await supabaseClient
    .from('outputs')
    .select('*')
    .in('run_id', runIds)

  if (outputsError) throw outputsError
  if (!outputs || outputs.length === 0) {
    return { modelAnalytics: [], attributeFailures: [], patterns: [] }
  }

  // Fetch document info
  const documentIds = [...new Set(runs.map((r: Run) => r.document_id))]
  const { data: documents, error: docsError } = await supabaseClient
    .from('documents')
    .select('id, filename')
    .in('id', documentIds)

  if (docsError) throw docsError

  // Get unique models
  const uniqueModels: string[] = [...new Set<string>(outputs.map((o: Output) => o.model))]

  // Calculate per-model analytics
  const modelAnalytics = uniqueModels.map(model =>
    calculateModelAnalytics(model, outputs, runs, documents || [])
  )

  // Analyze attribute failures
  const attributeFailures = analyzeAttributeFailures(outputs, runs, documents || [])

  // Detect patterns
  const patterns = detectPatterns(
    attributeFailures,
    modelAnalytics,
    uniqueModels.length,
    documents?.length || 0
  )

  return {
    modelAnalytics,
    attributeFailures,
    patterns
  }
}
