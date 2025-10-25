'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const supabase = createClient()

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1)

  // Batch document state (v3.0: multiple documents)
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [documentCount, setDocumentCount] = useState(0)
  const [totalCharCount, setTotalCharCount] = useState(0)

  // Prompt state
  const [batchName, setBatchName] = useState('')
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
          setCurrentStep(4)

          // Fetch analytics
          const analyticsResponse = await fetch(`/api/batch/${batchJobId}/analytics`)
          const analyticsData: BatchAnalytics = await analyticsResponse.json()
          setBatchAnalytics(analyticsData)

          clearInterval(pollInterval)
        } else if (data.status === 'failed') {
          setIsProcessing(false)
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

    // Auto-generate batch name
    const timestamp = new Date().toLocaleString()
    setBatchName(`Batch (${docIds.length} docs) - ${timestamp}`)

    setCurrentStep(2)
  }

  const handleConfigChange = (config: {
    outputFormat: 'json' | 'jsonl'
    systemPrompt: string
    userPrompt: string
    validationSchema: object
  }) => {
    setOutputFormat(config.outputFormat)
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

      if (!startResponse.ok) {
        const errorData = await startResponse.json()
        throw new Error(errorData.error || 'Failed to start batch processing')
      }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LLM Document Analysis v3.0</h1>
              <p className="text-sm text-gray-500">Batch Processing with Comprehensive Analytics{userEmail && ` • ${userEmail}`}</p>
            </div>
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Home
            </a>
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                      }
                    `}
                  >
                    {step.num}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      currentStep >= step.num ? 'text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded ${
                      currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
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
        <div className="space-y-8">
          {/* Step 1: Upload Documents */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">1. Upload Documents</h2>
                <p className="text-sm text-gray-500 mt-1">Upload one or more PDF, DOCX, or TXT files for batch processing</p>
              </div>
              {documentCount > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{documentCount} document{documentCount !== 1 ? 's' : ''} uploaded</p>
                  <p className="text-xs text-gray-500">{totalCharCount.toLocaleString()} total characters</p>
                </div>
              )}
            </div>
            <DocumentUpload onUploadComplete={handleDocumentUpload} />
          </section>

          {/* Step 2: Configure Prompts */}
          {currentStep >= 2 && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">2. Configure Extraction</h2>
                <p className="text-sm text-gray-500 mt-1">Set up prompts and schema (applies to all {documentCount} documents)</p>
              </div>

              {/* Batch Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Job Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="E.g., Contract Extraction Batch 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <PromptEditor onConfigChange={handleConfigChange} />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={!systemPrompt || !userPrompt || !validationSchema}
                >
                  Next: Select Models →
                </button>
              </div>
            </section>
          )}

          {/* Step 3: Select Models & Run */}
          {currentStep >= 3 && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">3. Run Batch Processing</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select models to run on all {documentCount} documents
                </p>
              </div>

              <ModelSelector
                onSelectionChange={handleModelsChange}
                estimatedTokens={Math.ceil((systemPrompt.length + userPrompt.length) / 3.5) * documentCount}
              />

              {/* Batch Summary */}
              {selectedModels.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Batch Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Documents:</p>
                      <p className="font-semibold text-blue-900">{documentCount}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Models:</p>
                      <p className="font-semibold text-blue-900">{selectedModels.length}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Total Runs:</p>
                      <p className="font-semibold text-blue-900">{documentCount * selectedModels.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Run Button */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
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
                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900">Processing Batch...</h4>
                      {batchStatus.currentDocument && (
                        <p className="text-sm text-blue-700 mt-1">
                          Currently processing: <span className="font-medium">{batchStatus.currentDocument}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-900">
                        {batchStatus.completedDocuments}/{batchStatus.totalDocuments}
                      </p>
                      <p className="text-xs text-blue-600">documents processed</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-4 transition-all duration-500 flex items-center justify-center"
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
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-sm text-gray-600">Successful</p>
                      <p className="text-xl font-bold text-green-600">{batchStatus.successfulRuns}</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-xl font-bold text-red-600">{batchStatus.failedRuns}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {batchError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900">{batchError}</p>
                </div>
              )}
            </section>
          )}

          {/* Step 4: View Analytics */}
          {currentStep >= 4 && batchAnalytics && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <BatchResults analytics={batchAnalytics} batchJobName={batchName} />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
