'use client'

import { useState, useEffect } from 'react'
import { InfoIcon } from '@/components/ui/InfoIcon'
import { JsonSchemaViewer } from './JsonSchemaViewer'

// Types
interface GlobalSummary {
  totalDocuments: number
  totalRuns: number
  successRate: number
  totalCost: number
  avgExecutionTime: number
  overallJsonValidityRate?: number
  overallAttributeValidityRate?: number
  overallFormatValidityRate?: number
  topGuidanceSuggestions?: string[]
}

interface ModelAnalytics {
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
  jsonValidityRate?: number
  attributeValidityRate?: number
  formatValidityRate?: number
  validationBreakdown?: {
    totalRuns?: number
    jsonValid?: number
    attributesValid?: number
    formatsValid?: number
    commonGuidance?: string[]
  }
}

interface DocumentResult {
  documentId: string
  filename: string
  modelsPassedCount: number
  modelsTotalCount: number
  status: 'all_passed' | 'partial' | 'all_failed'
}

interface AttributeFailure {
  attributePath: string
  missingCount: number
  typeMismatchCount: number
  formatViolationCount: number
  affectedModels: string[]
  pattern?: string
}

interface BatchAnalytics {
  globalSummary: GlobalSummary
  modelAnalytics: ModelAnalytics[]
  documentResults: DocumentResult[]
  attributeFailures: AttributeFailure[]
}

interface BatchResultsProps {
  analytics: BatchAnalytics
  batchJobName: string
  batchJobId: string
}

type TabType = 'summary' | 'models' | 'documents' | 'attributes' | 'detailed'

// Helper function to render progress bar with color
function ValidationProgressBar({ percentage }: { percentage?: number }) {
  if (percentage === undefined || percentage === null) {
    return <span className="text-xs text-gray-400">N/A</span>
  }

  const getColor = () => {
    if (percentage >= 80) return 'bg-green-600'
    if (percentage >= 50) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      <span className="text-xs font-medium text-gray-700 w-10 text-right">
        {Math.round(percentage)}%
      </span>
    </div>
  )
}

export function BatchResults({ analytics, batchJobName, batchJobId }: BatchResultsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [showGuidanceModal, setShowGuidanceModal] = useState(false)

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'summary', label: 'Global Summary', icon: '📊' },
    { id: 'models', label: 'Per-Model Analysis', icon: '🤖' },
    { id: 'documents', label: 'Per-Document Details', icon: '📄' },
    { id: 'attributes', label: 'Attribute Failures', icon: '🔍' },
    { id: 'detailed', label: 'Detailed Results', icon: '🔬' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{batchJobName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Batch Processing Results - {analytics.globalSummary.totalDocuments} documents, {analytics.modelAnalytics.length} models
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'summary' && (
          <GlobalSummaryTab
            summary={analytics.globalSummary}
            modelAnalytics={analytics.modelAnalytics}
            onOpenGuidanceModal={() => setShowGuidanceModal(true)}
          />
        )}
        {activeTab === 'models' && (
          <ModelAnalysisTab
            modelAnalytics={analytics.modelAnalytics}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentDetailsTab
            documentResults={analytics.documentResults}
            selectedDocument={selectedDocument}
            onSelectDocument={setSelectedDocument}
          />
        )}
        {activeTab === 'attributes' && (
          <AttributeFailuresTab
            attributeFailures={analytics.attributeFailures}
            totalModels={analytics.modelAnalytics.length}
          />
        )}
        {activeTab === 'detailed' && (
          <DetailedResultsTab
            batchJobId={batchJobId}
            modelAnalytics={analytics.modelAnalytics}
          />
        )}
      </div>

      {/* Prompt Guidance Modal */}
      {showGuidanceModal && (
        <PromptGuidanceModal
          modelAnalytics={analytics.modelAnalytics}
          onClose={() => setShowGuidanceModal(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Tab 1: Global Summary
// ============================================================================

function GlobalSummaryTab({
  summary,
  modelAnalytics,
  onOpenGuidanceModal
}: {
  summary: GlobalSummary
  modelAnalytics: ModelAnalytics[]
  onOpenGuidanceModal: () => void
}) {
  const topModels = [...modelAnalytics]
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 3)

  const hasGuidance = summary.topGuidanceSuggestions && summary.topGuidanceSuggestions.length > 0

  // Determine batch status
  const totalRuns = summary.totalRuns
  const successfulRuns = Math.round(summary.successRate * totalRuns)
  const failedRuns = totalRuns - successfulRuns
  const allPassed = failedRuns === 0
  const allFailed = successfulRuns === 0
  const partialSuccess = failedRuns > 0 && successfulRuns > 0

  const getStatusBadge = () => {
    if (allFailed) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-sm font-semibold text-red-900">All Models Failed</p>
            <p className="text-xs text-red-700">No successful extractions - check model configurations and prompts</p>
          </div>
        </div>
      )
    }
    if (partialSuccess) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 border border-yellow-300 rounded-lg">
          <span className="text-2xl">🟡</span>
          <div>
            <p className="text-sm font-semibold text-yellow-900">Completed with Errors</p>
            <p className="text-xs text-yellow-700">
              {successfulRuns} succeeded, {failedRuns} failed - check Per-Model Analysis for details
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
        <span className="text-2xl">🟢</span>
        <div>
          <p className="text-sm font-semibold text-green-900">Completed Successfully</p>
          <p className="text-xs text-green-700">All {totalRuns} runs passed validation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Batch Status Badge */}
      {getStatusBadge()}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Documents</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalDocuments}</p>
        </div>
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
          <p className="text-sm text-green-800">Success Rate</p>
          <p className="text-3xl font-bold text-green-900 mt-2">
            {Math.round(summary.successRate * 100)}%
          </p>
          <p className="text-xs text-green-600 mt-1">
            {Math.round(summary.successRate * summary.totalRuns)} / {summary.totalRuns} runs validated
          </p>
        </div>
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <p className="text-sm text-blue-800">Avg Time</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">
            {Math.round(summary.avgExecutionTime)}ms
          </p>
        </div>
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
          <p className="text-sm text-yellow-800">Total Cost</p>
          <p className="text-3xl font-bold text-yellow-900 mt-2">
            ${summary.totalCost.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏆</span>
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Models</h3>
          <InfoIcon tooltip="Models ranked by validation success rate" />
        </div>
        <div className="space-y-3">
          {topModels.map((model, idx) => (
            <div key={model.model} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{model.model}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-500">
                    {Math.round(model.successRate * 100)}% success
                  </span>
                  <span className="text-xs text-gray-500">
                    {model.avgExecutionTime}ms avg time
                  </span>
                  <span className="text-xs text-gray-500">
                    ${model.totalCost.toFixed(6)} total
                  </span>
                </div>
              </div>
              <div className="w-32">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${model.successRate * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Improvement Tips */}
      {hasGuidance && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <h3 className="text-lg font-semibold text-amber-900">Prompt Improvement Tips</h3>
              <InfoIcon tooltip="Most common suggestions to improve extraction quality across all models" />
            </div>
            <button
              onClick={onOpenGuidanceModal}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
            >
              View All Suggestions
            </button>
          </div>
          <div className="space-y-2">
            {summary.topGuidanceSuggestions!.slice(0, 5).map((guidance, idx) => (
              <div key={idx} className="p-3 bg-white border border-amber-200 rounded text-sm flex items-start gap-2">
                <span className="text-amber-600 font-bold text-lg">→</span>
                <p className="flex-1 text-amber-900">{guidance}</p>
              </div>
            ))}
          </div>
          {summary.topGuidanceSuggestions!.length === 0 && (
            <p className="text-sm text-amber-700">No guidance available yet. Guidance will appear after processing batch jobs with validation failures.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Tab 2: Per-Model Analysis
// ============================================================================

function ModelAnalysisTab({
  modelAnalytics,
  selectedModel,
  onSelectModel
}: {
  modelAnalytics: ModelAnalytics[]
  selectedModel: string | null
  onSelectModel: (model: string | null) => void
}) {
  const sortedModels = [...modelAnalytics].sort((a, b) => b.successRate - a.successRate)

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  JSON Valid
                  <InfoIcon tooltip="Level 1: Percentage of runs with valid JSON syntax" className="text-gray-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Attributes
                  <InfoIcon tooltip="Level 2: Percentage with correct field names" className="text-gray-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Formats
                  <InfoIcon tooltip="Level 3: Percentage with correct value formats" className="text-gray-400" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedModels.map((model) => (
              <tr
                key={model.model}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedModel === model.model ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelectModel(model.model === selectedModel ? null : model.model)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{model.model}</div>
                  <div className="text-xs text-gray-500">
                    {model.successCount + model.failureCount} runs
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.round(model.successRate * 100)}%
                    </span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          model.successRate >= 0.8
                            ? 'bg-green-600'
                            : model.successRate >= 0.5
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${model.successRate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {model.successCount} / {model.successCount + model.failureCount}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ValidationProgressBar percentage={model.jsonValidityRate} />
                </td>
                <td className="px-4 py-4">
                  <ValidationProgressBar percentage={model.attributeValidityRate} />
                </td>
                <td className="px-4 py-4">
                  <ValidationProgressBar percentage={model.formatValidityRate} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {model.avgExecutionTime}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${model.totalCost.toFixed(6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model Details */}
      {selectedModel && (
        <div className="space-y-4">
          {(() => {
            const model = modelAnalytics.find(m => m.model === selectedModel)
            if (!model) return null

            const hasValidationData = model.jsonValidityRate !== undefined ||
                                     model.attributeValidityRate !== undefined ||
                                     model.formatValidityRate !== undefined

            return (
              <>
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{model.model} - Detailed Analysis</h3>

                  {/* 3-Level Validation Breakdown */}
                  {hasValidationData && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Validation Level Breakdown</h4>
                        <InfoIcon tooltip="Progressive validation showing which level this model reaches" />
                      </div>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Level 1: JSON Validity</span>
                            <InfoIcon tooltip="Percentage of runs producing valid, parseable JSON" className="text-gray-400" />
                          </div>
                          <div className="flex-1 ml-4 max-w-xs">
                            <ValidationProgressBar percentage={model.jsonValidityRate} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Level 2: Attribute Validity</span>
                            <InfoIcon tooltip="Percentage with correct field names and structure" className="text-gray-400" />
                          </div>
                          <div className="flex-1 ml-4 max-w-xs">
                            <ValidationProgressBar percentage={model.attributeValidityRate} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Level 3: Format Validity</span>
                            <InfoIcon tooltip="Percentage with correct value types and formats" className="text-gray-400" />
                          </div>
                          <div className="flex-1 ml-4 max-w-xs">
                            <ValidationProgressBar percentage={model.formatValidityRate} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prompt Improvement Guidance - Now includes error guidance */}
                  {model.validationBreakdown?.commonGuidance && model.validationBreakdown.commonGuidance.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          {model.commonErrors.length > 0 ? 'Troubleshooting Guidance' : 'Prompt Improvement Suggestions'}
                        </h4>
                        <InfoIcon tooltip="Specific guidance to resolve errors or improve extraction quality" />
                      </div>
                      <div className="space-y-2">
                        {model.validationBreakdown.commonGuidance.slice(0, 5).map((guidance, idx) => {
                          // Determine guidance type for styling
                          const isError = guidance.includes('🔐') || guidance.includes('⏱️') ||
                                         guidance.includes('❌') || guidance.includes('🔧') ||
                                         guidance.includes('🔍') || guidance.includes('⚠️')

                          return (
                            <div
                              key={idx}
                              className={`p-3 border rounded text-sm flex items-start gap-2 ${
                                isError
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <span className={`font-bold ${isError ? 'text-red-600' : 'text-blue-600'}`}>
                                {isError ? '⚠️' : '💡'}
                              </span>
                              <p className={`flex-1 ${isError ? 'text-red-900' : 'text-blue-900'}`}>
                                {guidance}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Common Errors - Now Categorized */}
                  {model.commonErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Error Details</h4>
                      <div className="space-y-3">
                        {model.commonErrors.slice(0, 5).map((error, idx) => {
                          // Determine error category for icon and color
                          const getErrorStyle = (errorText: string) => {
                            if (errorText.includes('[Authentication Error]')) {
                              return { icon: '🔐', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', category: 'Authentication' }
                            }
                            if (errorText.includes('[Rate Limit]')) {
                              return { icon: '⏱️', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', category: 'Rate Limit' }
                            }
                            if (errorText.includes('[Timeout]')) {
                              return { icon: '⏳', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', category: 'Timeout' }
                            }
                            if (errorText.includes('[Invalid Model Name]')) {
                              return { icon: '🔍', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', category: 'Invalid Model' }
                            }
                            if (errorText.includes('[Model Unavailable]')) {
                              return { icon: '🚫', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', category: 'Unavailable' }
                            }
                            if (errorText.includes('[Invalid Request]')) {
                              return { icon: '❌', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', category: 'Invalid Request' }
                            }
                            if (errorText.includes('[Server Error]')) {
                              return { icon: '🔧', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', category: 'Server Error' }
                            }
                            if (errorText.includes('[Network Error]')) {
                              return { icon: '🌐', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', category: 'Network' }
                            }
                            if (errorText.includes('[Model Not Found]')) {
                              return { icon: '🔍', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', category: 'Not Found' }
                            }
                            return { icon: '⚠️', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', category: 'Unknown' }
                          }

                          const style = getErrorStyle(error.error)

                          return (
                            <div key={idx} className={`p-4 ${style.bg} border ${style.border} rounded-lg`}>
                              <div className="flex items-start gap-3">
                                <span className="text-xl">{style.icon}</span>
                                <div className="flex-1">
                                  <p className={`font-medium ${style.text} text-sm`}>
                                    {error.error.replace(/^\[.*?\]\s*/, '')}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-2">
                                    Occurred {error.count} time{error.count > 1 ? 's' : ''}
                                    {error.documents && error.documents.length > 0 && (
                                      <> in {error.documents.length} document{error.documents.length > 1 ? 's' : ''}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Tab 3: Per-Document Details
// ============================================================================

function DocumentDetailsTab({
  documentResults,
  selectedDocument,
  onSelectDocument
}: {
  documentResults: DocumentResult[]
  selectedDocument: string | null
  onSelectDocument: (docId: string | null) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDocs = documentResults.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'all_passed': return 'bg-green-100 text-green-800 border-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'all_failed': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500">
          {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Documents Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Models Passed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDocs.map((doc) => (
              <tr key={doc.documentId} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {doc.modelsPassedCount} / {doc.modelsTotalCount}
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(doc.modelsPassedCount / doc.modelsTotalCount) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(doc.status)}`}>
                    {doc.status === 'all_passed' && '✅ All Passed'}
                    {doc.status === 'partial' && '⚠️ Partial'}
                    {doc.status === 'all_failed' && '❌ All Failed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Tab 4: Attribute Failures
// ============================================================================

function AttributeFailuresTab({
  attributeFailures,
  totalModels
}: {
  attributeFailures: AttributeFailure[]
  totalModels: number
}) {
  if (attributeFailures.length === 0) {
    return (
      <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
        <span className="text-4xl mb-4 block">✨</span>
        <p className="text-lg font-semibold text-green-900">Perfect Extraction!</p>
        <p className="text-sm text-green-700 mt-2">All models successfully validated all attributes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <InfoIcon tooltip="Attribute failure insights" className="text-blue-700 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Attribute Failure Analysis</p>
            <p className="text-xs text-blue-700 mt-1">
              Identifies which schema attributes are most problematic across all models and documents.
              Use these insights to refine your prompts, schemas, or verify data exists in source documents.
            </p>
          </div>
        </div>
      </div>

      {/* Failures Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attribute Path
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Validation Level
                  <InfoIcon tooltip="Which validation level this failure belongs to" className="text-gray-400" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Missing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Format Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Affected Models
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pattern Insight
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attributeFailures.map((failure) => {
              const totalFailures = failure.missingCount + failure.typeMismatchCount + failure.formatViolationCount
              const isUniversal = failure.affectedModels.length === totalModels

              // Determine primary validation level
              const getPrimaryLevel = () => {
                if (failure.missingCount > 0) return { level: 'Level 2', label: 'Attributes', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
                if (failure.typeMismatchCount > 0 || failure.formatViolationCount > 0) return { level: 'Level 3', label: 'Formats', color: 'bg-orange-100 text-orange-800 border-orange-200' }
                return { level: 'Unknown', label: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' }
              }
              const primaryLevel = getPrimaryLevel()

              return (
                <tr key={failure.attributePath} className={isUniversal ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-mono font-medium text-gray-900">
                      {failure.attributePath || '(root)'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {totalFailures} total failure{totalFailures > 1 ? 's' : ''}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${primaryLevel.color}`}>
                      {primaryLevel.level}: {primaryLevel.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {failure.missingCount > 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                        {failure.missingCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {failure.typeMismatchCount > 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                        {failure.typeMismatchCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {failure.formatViolationCount > 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                        {failure.formatViolationCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {failure.affectedModels.length} / {totalModels}
                    {isUniversal && (
                      <span className="ml-2 text-xs font-semibold text-red-600">ALL</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {failure.pattern || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Prompt Guidance Modal
// ============================================================================

function PromptGuidanceModal({
  modelAnalytics,
  onClose
}: {
  modelAnalytics: ModelAnalytics[]
  onClose: () => void
}) {
  // Aggregate all guidance from all models with counts
  const guidanceMap = new Map<string, { count: number; models: string[] }>()

  for (const model of modelAnalytics) {
    if (model.validationBreakdown?.commonGuidance) {
      for (const guidance of model.validationBreakdown.commonGuidance) {
        const existing = guidanceMap.get(guidance)
        if (existing) {
          existing.count++
          if (!existing.models.includes(model.model)) {
            existing.models.push(model.model)
          }
        } else {
          guidanceMap.set(guidance, { count: 1, models: [model.model] })
        }
      }
    }
  }

  const allGuidance = Array.from(guidanceMap.entries())
    .map(([text, data]) => ({ text, ...data }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <h2 className="text-xl font-bold text-gray-900">All Prompt Improvement Suggestions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {allGuidance.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">✨</span>
              <p className="text-lg font-semibold text-gray-900">No Guidance Yet</p>
              <p className="text-sm text-gray-600 mt-2">
                Guidance suggestions will appear after processing batch jobs with validation failures.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>Total Suggestions:</strong> {allGuidance.length} unique insights from {modelAnalytics.length} models
                </p>
              </div>

              {allGuidance.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-xl mt-0.5">→</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">{item.text}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-amber-700">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          Occurred <strong>{item.count}</strong> time{item.count > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                          Affects <strong>{item.models.length}</strong> model{item.models.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium">
                            View affected models
                          </summary>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.models.map((model) => (
                              <span
                                key={model}
                                className="px-2 py-1 bg-white border border-amber-200 rounded text-amber-800"
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Tab 5: Detailed Results
// ============================================================================

interface DetailedOutput {
  outputId: string
  model: string
  documentId: string
  documentFilename: string
  rawResponse: string | null
  jsonPayload: any
  jsonValid: boolean
  attributesValid: boolean
  formatsValid: boolean
  validationDetails: {
    jsonErrors: string[]
    missingAttributes: string[]
    invalidAttributes: string[]
    formatErrors: Array<{
      path: string
      message: string
      keyword?: string
    }>
  }
  promptGuidance: string[]
  executionTimeMs: number
  tokensIn: number | null
  tokensOut: number | null
  costIn: number | null
  costOut: number | null
  errorMessage: string | null
  validationPassed: boolean
}

interface DetailedResultsData {
  batchJob: {
    systemPrompt: string
    userPrompt: string
    validationSchema: any
  }
  outputs: DetailedOutput[]
}

function DetailedResultsTab({
  batchJobId,
  modelAnalytics
}: {
  batchJobId: string
  modelAnalytics: ModelAnalytics[]
}) {
  const [data, setData] = useState<DetailedResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOutputId, setExpandedOutputId] = useState<string | null>(null)

  // Filters
  const [filterModel, setFilterModel] = useState<string>('all')
  const [filterDocument, setFilterDocument] = useState<string>('all')
  const [filterValidation, setFilterValidation] = useState<string>('all')

  // Fetch detailed outputs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/batch/${batchJobId}/detailed-outputs`)
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }
        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [batchJobId])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Error loading detailed results: {error}</p>
      </div>
    )
  }

  if (!data || data.outputs.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl mb-4 block">📭</span>
        <p className="text-lg font-semibold text-gray-900">No outputs found</p>
        <p className="text-sm text-gray-600 mt-2">
          No detailed outputs are available for this batch job.
        </p>
      </div>
    )
  }

  // Extract unique models and documents for filters
  const uniqueModels = Array.from(new Set(data.outputs.map(o => o.model))).sort()
  const uniqueDocuments = Array.from(new Set(data.outputs.map(o => o.documentFilename))).sort()

  // Apply filters
  const filteredOutputs = data.outputs.filter(output => {
    if (filterModel !== 'all' && output.model !== filterModel) return false
    if (filterDocument !== 'all' && output.documentFilename !== filterDocument) return false
    if (filterValidation === 'passed' && !output.validationPassed) return false
    if (filterValidation === 'failed' && output.validationPassed) return false
    if (filterValidation === 'json_invalid' && output.jsonValid) return false
    if (filterValidation === 'attr_invalid' && output.attributesValid) return false
    if (filterValidation === 'format_invalid' && output.formatsValid) return false
    return true
  })

  // Get validation status badge
  const getValidationBadge = (output: DetailedOutput) => {
    if (output.errorMessage) {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">ERROR</span>
    }
    if (!output.jsonValid) {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">JSON INVALID</span>
    }
    if (!output.attributesValid) {
      return <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">ATTR INVALID</span>
    }
    if (!output.formatsValid) {
      return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">FORMAT INVALID</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">VALID</span>
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔬</span>
          <h3 className="text-lg font-semibold text-blue-900">Detailed Results</h3>
        </div>
        <p className="text-sm text-blue-800">
          Full transparency into each LLM response: prompts sent, raw responses, extracted JSON, and schema comparison.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Model</label>
          <select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Models ({uniqueModels.length})</option>
            {uniqueModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Document</label>
          <select
            value={filterDocument}
            onChange={(e) => setFilterDocument(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Documents ({uniqueDocuments.length})</option>
            {uniqueDocuments.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Validation</label>
          <select
            value={filterValidation}
            onChange={(e) => setFilterValidation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Results</option>
            <option value="passed">Passed Validation</option>
            <option value="failed">Failed Validation</option>
            <option value="json_invalid">JSON Invalid</option>
            <option value="attr_invalid">Attributes Invalid</option>
            <option value="format_invalid">Formats Invalid</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing <strong>{filteredOutputs.length}</strong> of <strong>{data.outputs.length}</strong> outputs
      </div>

      {/* Outputs List */}
      <div className="space-y-4">
        {filteredOutputs.map((output) => {
          const isExpanded = expandedOutputId === output.outputId
          const totalCost = (output.costIn || 0) + (output.costOut || 0)

          return (
            <div key={output.outputId} className="border rounded-lg overflow-hidden">
              {/* Output Card Header */}
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedOutputId(isExpanded ? null : output.outputId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{output.model}</h4>
                      {getValidationBadge(output)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Document:</strong> {output.documentFilename}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>⏱️ {output.executionTimeMs}ms</span>
                      {output.tokensIn && <span>📥 {output.tokensIn} tokens</span>}
                      {output.tokensOut && <span>📤 {output.tokensOut} tokens</span>}
                      {totalCost > 0 && <span>💰 ${totalCost.toFixed(6)}</span>}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-6 space-y-6 bg-white">
                  {/* Error Message */}
                  {output.errorMessage && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h5 className="text-sm font-semibold text-red-900 mb-2">Error</h5>
                      <p className="text-sm text-red-700">{output.errorMessage}</p>
                    </div>
                  )}

                  {/* Validation Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`p-3 rounded-lg border ${output.jsonValid ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-xs font-medium ${output.jsonValid ? 'text-blue-700' : 'text-red-700'}`}>Level 1: JSON Valid</p>
                      <p className={`text-lg font-bold ${output.jsonValid ? 'text-blue-900' : 'text-red-900'}`}>
                        {output.jsonValid ? '✓ Pass' : '✗ Fail'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${output.attributesValid ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-xs font-medium ${output.attributesValid ? 'text-blue-700' : 'text-red-700'}`}>Level 2: Attributes Valid</p>
                      <p className={`text-lg font-bold ${output.attributesValid ? 'text-blue-900' : 'text-red-900'}`}>
                        {output.attributesValid ? '✓ Pass' : '✗ Fail'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${output.formatsValid ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-xs font-medium ${output.formatsValid ? 'text-blue-700' : 'text-red-700'}`}>Level 3: Formats Valid</p>
                      <p className={`text-lg font-bold ${output.formatsValid ? 'text-blue-900' : 'text-red-900'}`}>
                        {output.formatsValid ? '✓ Pass' : '✗ Fail'}
                      </p>
                    </div>
                  </div>

                  {/* Prompt Guidance */}
                  {output.promptGuidance && output.promptGuidance.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h5 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <span>💡</span>
                        Prompt Improvement Suggestions
                      </h5>
                      <ul className="space-y-2">
                        {output.promptGuidance.map((guide, idx) => (
                          <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                            <span className="text-amber-600 font-bold mt-0.5">→</span>
                            <span>{guide}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prompts Section */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">System Prompt</h5>
                    <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {data.batchJob.systemPrompt}
                    </pre>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">User Prompt</h5>
                    <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {data.batchJob.userPrompt}
                    </pre>
                  </div>

                  {/* Raw Response */}
                  {output.rawResponse && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Raw LLM Response</h5>
                      <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {output.rawResponse}
                      </pre>
                    </div>
                  )}

                  {/* Extracted JSON */}
                  {output.jsonPayload && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Extracted JSON</h5>
                      <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {JSON.stringify(output.jsonPayload, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Schema Comparison */}
                  {data.batchJob.validationSchema && output.jsonPayload && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Schema Comparison</h5>
                      <JsonSchemaViewer
                        schema={data.batchJob.validationSchema}
                        jsonPayload={output.jsonPayload}
                        validationDetails={output.validationDetails}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredOutputs.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-lg font-semibold text-gray-900">No results match your filters</p>
          <p className="text-sm text-gray-600 mt-2">
            Try adjusting your filter selections to see more results.
          </p>
        </div>
      )}
    </div>
  )
}
