'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DocumentUpload } from '@/components/upload/DocumentUpload'
import { PromptEditor } from '@/components/prompt/PromptEditor'
import { ModelSelector } from '@/components/results/ModelSelector'
import { BatchResults } from '@/components/results/BatchResults'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type Model = Database['public']['Tables']['models']['Row']

interface BatchStatus {
  batchJobId: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalDocuments: number
  completedDocuments: number
  successfulRuns: number
  failedRuns: number
  currentDocument?: string
  errorMessage?: string
}

interface BatchAnalytics {
  globalSummary: {
    totalDocuments: number
    totalRuns: number
    successRate: number
    totalCost: number
    avgExecutionTime: number
  }
  modelAnalytics: Array<{
    model: string
    successCount: number
    failureCount: number
    successRate: number
    avgExecutionTime: number
    totalCost: number
    commonErrors: Array<{
      error: string
      count: number
      documents?: string[]
    }>
  }>
  documentResults: Array<{
    documentId: string
    filename: string
    modelsPassedCount: number
    modelsTotalCount: number
    status: 'all_passed' | 'partial' | 'all_failed'
  }>
  attributeFailures: Array<{
    attributePath: string
    missingCount: number
    typeMismatchCount: number
    formatViolationCount: number
    affectedModels: string[]
    pattern?: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Cloning state
  const [isLoadingClone, setIsLoadingClone] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [clonedDocuments, setClonedDocuments] = useState<Array<{
    id: string
    filename: string
    char_count: number
  }>>([])
  const [clonedModels, setClonedModels] = useState<Model[]>([])

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1)

  // Batch document state (v3.0: multiple documents)
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [documentCount, setDocumentCount] = useState(0)
  const [totalCharCount, setTotalCharCount] = useState(0)

  // Prompt state
  const [batchName, setBatchName] = useState('')
  const [originalUserInput, setOriginalUserInput] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [outputFormat, setOutputFormat] = useState<'json' | 'jsonl'>('json')
  const [validationSchema, setValidationSchema] = useState<object | null>(null)

  // Model state
  const [selectedModels, setSelectedModels] = useState<Model[]>([])

  // Batch execution state
  const [batchJobId, setBatchJobId] = useState<string | null>(null)
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [timeoutWarning, setTimeoutWarning] = useState(false)

  // Results state
  const [batchAnalytics, setBatchAnalytics] = useState<BatchAnalytics | null>(null)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        setIsAuthenticated(true)
        setUserEmail(user.email || null)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/auth/login')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router, supabase.auth])

  // Load cloned batch configuration if cloneFrom parameter is present
  useEffect(() => {
    const loadClonedBatch = async () => {
      const cloneFromId = searchParams.get('cloneFrom')
      if (!cloneFromId || !isAuthenticated) return

      setIsLoadingClone(true)
      setCloneError(null)

      try {
        // Fetch batch configuration
        const response = await fetch(`/api/batches/${cloneFromId}/config`)
        if (!response.ok) {
          throw new Error('Failed to load batch configuration')
        }

        const config = await response.json()

        console.log('📦 Received config:', {
          name: config.name,
          documentsCount: config.documents?.length || 0,
          modelsCount: config.modelsUsed?.length || 0,
          hasSystemPrompt: !!config.systemPrompt,
          hasUserPrompt: !!config.userPrompt,
          hasValidationSchema: !!config.validationSchema,
        })

        // Pre-fill state with cloned configuration
        setDocumentIds(config.documents.map((d: any) => d.id))
        setDocumentCount(config.documents.length)
        setBatchName(`${config.name} (Copy)`)
        setOriginalUserInput(config.originalUserInput || '')
        setSystemPrompt(config.systemPrompt)
        setUserPrompt(config.userPrompt)
        setOutputFormat(config.outputFormat)
        setValidationSchema(config.validationSchema)

        // Store documents for DocumentUpload component
        setClonedDocuments(config.documents.map((d: any) => ({
          id: d.id,
          filename: d.filename,
          char_count: d.char_count || d.full_text?.length || 0
        })))

        // Calculate total char count
        const totalChars = config.documents.reduce(
          (sum: number, doc: any) => sum + (doc.char_count || doc.full_text?.length || 0),
          0
        )
        setTotalCharCount(totalChars)

        // Fetch and set models
        const { data: allModels } = await supabase.from('models').select('*')
        if (allModels) {
          const models = allModels.filter((model) =>
            config.modelsUsed.includes(`${model.provider}/${model.name}`)
          )
          setSelectedModels(models)
          setClonedModels(models) // Store for ModelSelector component
        }

        // Move to step 2 (configure extraction) so user can review configuration
        setCurrentStep(2)
      } catch (error) {
        console.error('Error loading cloned batch:', error)
        setCloneError(
          error instanceof Error ? error.message : 'Failed to load batch'
        )
      } finally {
        setIsLoadingClone(false)
      }
    }

    loadClonedBatch()
  }, [searchParams, isAuthenticated, supabase])

  // Poll for batch status while processing
  useEffect(() => {
    if (!batchJobId || !isProcessing) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch/${batchJobId}/status`)
        const data: BatchStatus = await response.json()

        setBatchStatus(data)

        if (data.status === 'completed') {
          setIsProcessing(false)
          setTimeoutWarning(false) // Clear timeout warning
          setCurrentStep(4)

          // Fetch analytics
          const analyticsResponse = await fetch(`/api/batch/${batchJobId}/analytics`)
          const analyticsData: BatchAnalytics = await analyticsResponse.json()
          setBatchAnalytics(analyticsData)

          clearInterval(pollInterval)
        } else if (data.status === 'failed') {
          setIsProcessing(false)
          setTimeoutWarning(false) // Clear timeout warning
          setBatchError(data.errorMessage || 'Batch processing failed')
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error polling batch status:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [batchJobId, isProcessing])

  const handleDocumentUpload = async (docIds: string[]) => {
    setDocumentIds(docIds)
    setDocumentCount(docIds.length)
    setBatchError(null)

    // Fetch document details to show summary
    const { data: docs } = await supabase
      .from('documents')
      .select('char_count')
      .in('id', docIds)

    if (docs) {
      const totalChars = docs.reduce((sum, doc) => sum + (doc.char_count || 0), 0)
      setTotalCharCount(totalChars)
    }

    // Auto-generate batch name only if not cloning (batch name not already set)
    if (!batchName) {
      const timestamp = new Date().toLocaleString()
      setBatchName(`Batch (${docIds.length} docs) - ${timestamp}`)
    }

    setCurrentStep(2)
  }

  const handleConfigChange = (config: {
    outputFormat: 'json' | 'jsonl'
    originalUserInput: string
    systemPrompt: string
    userPrompt: string
    validationSchema: object
  }) => {
    setOutputFormat(config.outputFormat)
    setOriginalUserInput(config.originalUserInput)
    setSystemPrompt(config.systemPrompt)
    setUserPrompt(config.userPrompt)
    setValidationSchema(config.validationSchema)
  }

  const handleModelsChange = (models: Model[]) => {
    setSelectedModels(models)
  }

  const canRunBatch = documentIds.length > 0 && systemPrompt && userPrompt && validationSchema && selectedModels.length > 0

  const createAndStartBatch = async () => {
    if (!canRunBatch) return

    setIsCreatingBatch(true)
    setBatchError(null)

    try {
      // Step 1: Create batch job
      const createResponse = await fetch('/api/batch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds,
          name: batchName,
          originalUserInput,
          systemPrompt,
          userPrompt,
          outputFormat,
          validationSchema,
          models: selectedModels.map(m => `${m.provider}/${m.name}`)
        })
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create batch job')
      }

      const createData = await createResponse.json()
      setBatchJobId(createData.batchJobId)

      // Step 2: Start processing
      const startResponse = await fetch('/api/batch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchJobId: createData.batchJobId })
      })

      const startData = await startResponse.json()

      // Check if this is a timeout (202 Accepted)
      if (startResponse.status === 202 || startData.isTimeout) {
        console.warn('Batch processing timeout - continuing to poll status')
        setTimeoutWarning(true)
        setIsProcessing(true)
        setBatchStatus({
          batchJobId: createData.batchJobId,
          name: batchName,
          status: 'processing',
          totalDocuments: documentIds.length,
          completedDocuments: 0,
          successfulRuns: 0,
          failedRuns: 0
        })
        // Continue - polling will pick up status updates
        return
      }

      if (!startResponse.ok) {
        throw new Error(startData.error || 'Failed to start batch processing')
      }

      setIsProcessing(true)
      setTimeoutWarning(false)
      setBatchStatus({
        batchJobId: createData.batchJobId,
        name: batchName,
        status: 'processing',
        totalDocuments: documentIds.length,
        completedDocuments: 0,
        successfulRuns: 0,
        failedRuns: 0
      })

    } catch (error) {
      setBatchError(error instanceof Error ? error.message : 'An error occurred')
      console.error('Batch creation error:', error)
    } finally {
      setIsCreatingBatch(false)
    }
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Show loading while cloning batch
  if (isLoadingClone) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading batch configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LLM Document Analysis v3.0</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Batch Processing with Comprehensive Analytics{userEmail && ` • ${userEmail}`}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/batches"
                className="px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                View Batch History
              </a>
              <a
                href="/"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
              >
                ← Back to Home
              </a>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mt-6 flex items-center justify-between">
            {[
              { num: 1, label: 'Upload Documents' },
              { num: 2, label: 'Configure Extraction' },
              { num: 3, label: 'Run Batch Processing' },
              { num: 4, label: 'View Analytics' },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold
                      ${currentStep >= step.num
                        ? 'bg-primary-600 dark:bg-primary-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {step.num}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      currentStep >= step.num ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded ${
                      currentStep > step.num ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Clone Error Banner */}
        {cloneError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Failed to load batch configuration</p>
                <p className="text-sm text-red-700 mt-1">{cloneError}</p>
              </div>
              <button
                onClick={() => setCloneError(null)}
                className="flex-shrink-0 text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Cloning Info Banner */}
        {searchParams.get('cloneFrom') && !cloneError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Cloning batch configuration</p>
                <p className="text-sm text-blue-700 mt-1">You can modify any settings before running. A new batch will be created when you click "Start Batch Processing".</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Step 1: Upload Documents */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">1. Upload Documents</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload one or more PDF, DOCX, or TXT files for batch processing</p>
              </div>
              {documentCount > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{documentCount} document{documentCount !== 1 ? 's' : ''} uploaded</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{totalCharCount.toLocaleString()} total characters</p>
                </div>
              )}
            </div>
            <DocumentUpload
              onUploadComplete={handleDocumentUpload}
              initialDocuments={clonedDocuments.length > 0 ? clonedDocuments : undefined}
            />
          </section>

          {/* Step 2: Configure Prompts */}
          {currentStep >= 2 && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">2. Configure Extraction</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Set up prompts and schema (applies to all {documentCount} documents)</p>
              </div>

              {/* Batch Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batch Job Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="E.g., Contract Extraction Batch 1"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <PromptEditor
                onConfigChange={handleConfigChange}
                initialOutputFormat={outputFormat || undefined}
                initialOriginalInput={originalUserInput || undefined}
                initialOptimizedPrompt={userPrompt || undefined}
                initialSchema={validationSchema || undefined}
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  disabled={!systemPrompt || !userPrompt || !validationSchema}
                >
                  Next: Select Models →
                </button>
              </div>
            </section>
          )}

          {/* Step 3: Select Models & Run */}
          {currentStep >= 3 && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">3. Run Batch Processing</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Select models to run on all {documentCount} documents
                </p>
              </div>

              <ModelSelector
                onSelectionChange={handleModelsChange}
                estimatedTokens={Math.ceil((systemPrompt.length + userPrompt.length) / 3.5) * documentCount}
                initialSelectedModels={clonedModels.length > 0 ? clonedModels : undefined}
              />

              {/* Batch Summary */}
              {selectedModels.length > 0 && (
                <div className="mt-6 p-4 bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg">
                  <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">Batch Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-primary-700 dark:text-primary-300">Documents:</p>
                      <p className="font-semibold text-primary-900 dark:text-primary-100">{documentCount}</p>
                    </div>
                    <div>
                      <p className="text-primary-700 dark:text-primary-300">Models:</p>
                      <p className="font-semibold text-primary-900 dark:text-primary-100">{selectedModels.length}</p>
                    </div>
                    <div>
                      <p className="text-primary-700 dark:text-primary-300">Total Runs:</p>
                      <p className="font-semibold text-primary-900 dark:text-primary-100">{documentCount * selectedModels.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Run Button */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={isProcessing}
                >
                  ← Back to Configuration
                </button>
                <button
                  onClick={createAndStartBatch}
                  disabled={!canRunBatch || isCreatingBatch || isProcessing}
                  className={`
                    px-8 py-3 rounded-lg font-semibold text-white transition-colors
                    ${canRunBatch && !isCreatingBatch && !isProcessing
                      ? 'bg-success-600 dark:bg-success-500 hover:bg-success-700 dark:hover:bg-success-600'
                      : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    }
                  `}
                >
                  {isCreatingBatch ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Batch...
                    </span>
                  ) : isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </span>
                  ) : (
                    `Start Batch Processing (${documentCount * selectedModels.length} runs)`
                  )}
                </button>
              </div>

              {/* Progress Display */}
              {isProcessing && batchStatus && (
                <div className="mt-6 p-6 bg-gradient-to-r from-primary-50/50 to-primary-100/50 dark:from-primary-950/30 dark:to-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-primary-900 dark:text-primary-100">Processing Batch...</h4>
                      {batchStatus.currentDocument && (
                        <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                          Currently processing: <span className="font-medium">{batchStatus.currentDocument}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                        {batchStatus.completedDocuments}/{batchStatus.totalDocuments}
                      </p>
                      <p className="text-xs text-primary-600 dark:text-primary-400">documents processed</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-primary-200 dark:bg-primary-900 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 h-4 transition-all duration-500 flex items-center justify-center"
                      style={{
                        width: `${(batchStatus.completedDocuments / batchStatus.totalDocuments) * 100}%`
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {Math.round((batchStatus.completedDocuments / batchStatus.totalDocuments) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                      <p className="text-xl font-bold text-success-600 dark:text-success-500">{batchStatus.successfulRuns}</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                      <p className="text-xl font-bold text-error-600 dark:text-error-500">{batchStatus.failedRuns}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeout Warning */}
              {isProcessing && timeoutWarning && (
                <div className="mt-6 p-4 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg">
                  <p className="text-sm font-semibold text-warning-900 dark:text-warning-100">
                    Processing Taking Longer Than Expected
                  </p>
                  <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                    Your batch is still being processed in the background. Status will update automatically when complete.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {batchError && (
                <div className="mt-4 p-4 bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800 rounded-lg">
                  <p className="text-sm text-error-900 dark:text-error-100">{batchError}</p>
                </div>
              )}
            </section>
          )}

          {/* Step 4: View Analytics */}
          {currentStep >= 4 && batchAnalytics && batchJobId && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <BatchResults analytics={batchAnalytics} batchJobName={batchName} batchJobId={batchJobId} />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
