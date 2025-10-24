'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentUpload } from '@/components/upload/DocumentUpload'
import { PromptEditor } from '@/components/prompt/PromptEditor'
import { ModelSelector } from '@/components/results/ModelSelector'
import { ResultsComparison } from '@/components/results/ResultsComparison'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type Model = Database['public']['Tables']['models']['Row']
type Output = Database['public']['Tables']['outputs']['Row']

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1)

  // Document state
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [documentInfo, setDocumentInfo] = useState<any>(null)

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [outputFormat, setOutputFormat] = useState<'json' | 'jsonl'>('json')
  const [validationSchema, setValidationSchema] = useState<object | null>(null)

  // Model state
  const [selectedModels, setSelectedModels] = useState<Model[]>([])

  // Execution state
  const [isRunning, setIsRunning] = useState(false)
  const [runProgress, setRunProgress] = useState('')
  const [runError, setRunError] = useState<string | null>(null)

  // Results state
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])

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

  const handleDocumentUpload = async (docId: string) => {
    setDocumentId(docId)
    setRunError(null)

    // Fetch document details
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single()

    if (!error && doc) {
      setDocumentInfo(doc)
      setDocumentText(doc.full_text || '')
      setCurrentStep(2)
    }
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

  const canRunInference = documentId && documentText && systemPrompt && userPrompt && selectedModels.length > 0

  const runInference = async () => {
    if (!canRunInference) return

    setIsRunning(true)
    setRunError(null)
    setRunProgress('Creating run record...')

    try {
      // Create run record
      const { data: run, error: runError } = await supabase
        .from('runs')
        .insert({
          document_id: documentId!,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          prompt_hash: `${Date.now()}`,
          models_used: selectedModels.map(m => `${m.provider}/${m.name}`),
        })
        .select()
        .single()

      if (runError) throw runError

      setCurrentRunId(run.id)
      setRunProgress(`Running ${selectedModels.length} models in parallel...`)

      // Prepare models data for Edge Function
      const modelsData = selectedModels.map(m => ({
        name: m.name,
        provider: m.provider,
        displayName: m.display_name,
        supportsJsonMode: m.supports_json_mode,
        priceIn: parseFloat(m.price_in.toString()),
        priceOut: parseFloat(m.price_out.toString()),
      }))

      // Call Edge Function
      const { data: result, error: inferenceError } = await supabase.functions
        .invoke('run-llm-inference', {
          body: {
            runId: run.id,
            documentText: documentText.substring(0, 20000), // Limit to 20K chars for now
            systemPrompt,
            userPrompt,
            outputFormat,
            validationSchema,
            models: modelsData,
          }
        })

      if (inferenceError) throw inferenceError

      if (!result.success) {
        throw new Error(result.error || 'Inference failed')
      }

      setRunProgress('Fetching results...')

      // Fetch outputs
      const { data: outputs, error: outputsError } = await supabase
        .from('outputs')
        .select('*')
        .eq('run_id', run.id)
        .order('created_at', { ascending: false })

      if (outputsError) throw outputsError

      setOutputs(outputs || [])
      setCurrentStep(4)
      setRunProgress(`Completed! ${result.results.length} models executed.`)

      // Clear progress after 3 seconds
      setTimeout(() => setRunProgress(''), 3000)

    } catch (error: any) {
      setRunError(error.message || 'An error occurred during inference')
      console.error('Inference error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const exportOutput = (output: Output) => {
    // Export as JSON file
    const dataStr = JSON.stringify(output.json_payload, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${output.model.replace(/\//g, '-')}-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
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
              <h1 className="text-2xl font-bold text-gray-900">LLM Document Analysis</h1>
              <p className="text-sm text-gray-500">Swedish Text Extraction PoC{userEmail && ` • ${userEmail}`}</p>
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
              { num: 1, label: 'Upload Document' },
              { num: 2, label: 'Configure Prompts' },
              { num: 3, label: 'Select Models' },
              { num: 4, label: 'View Results' },
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
          {/* Step 1: Upload Document */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">1. Upload Document</h2>
                <p className="text-sm text-gray-500 mt-1">Upload a PDF, DOCX, or TXT file to analyze</p>
              </div>
              {documentInfo && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{documentInfo.filename}</p>
                  <p className="text-xs text-gray-500">{documentInfo.char_count?.toLocaleString()} characters</p>
                </div>
              )}
            </div>
            <DocumentUpload onUploadComplete={handleDocumentUpload} />
          </section>

          {/* Step 2: Configure Prompts */}
          {currentStep >= 2 && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">2. Configure Prompts</h2>
                <p className="text-sm text-gray-500 mt-1">Customize the extraction instructions</p>
              </div>
              <PromptEditor
                onConfigChange={handleConfigChange}
              />
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

          {/* Step 3: Select Models */}
          {currentStep >= 3 && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">3. Select Models</h2>
                <p className="text-sm text-gray-500 mt-1">Choose which models to run for comparison</p>
              </div>
              <ModelSelector
                onSelectionChange={handleModelsChange}
                estimatedTokens={Math.ceil((systemPrompt.length + userPrompt.length + documentText.length) / 3.5)}
              />

              {/* Run Button */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ← Back to Prompts
                </button>
                <button
                  onClick={runInference}
                  disabled={!canRunInference || isRunning}
                  className={`
                    px-8 py-3 rounded-lg font-semibold text-white transition-colors
                    ${canRunInference && !isRunning
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isRunning ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Running...
                    </span>
                  ) : (
                    `Run ${selectedModels.length} Model${selectedModels.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>

              {/* Progress/Error Messages */}
              {runProgress && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">{runProgress}</p>
                </div>
              )}
              {runError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900">{runError}</p>
                </div>
              )}
            </section>
          )}

          {/* Step 4: View Results */}
          {currentStep >= 4 && outputs.length > 0 && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">4. View Results</h2>
                <p className="text-sm text-gray-500 mt-1">Compare model outputs and export data</p>
              </div>
              <ResultsComparison
                outputs={outputs}
                onExport={exportOutput}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
