'use client'

import { useState, useEffect } from 'react'
import { InfoIcon } from '@/components/ui/InfoIcon'
import { JsonSchemaViewer } from './JsonSchemaViewer'

// Types
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
  modelAnalytics: ModelAnalytics[]
  documentResults: DocumentResult[]
  attributeFailures: AttributeFailure[]
}

interface BatchResultsProps {
  analytics: BatchAnalytics
  batchJobName: string
  batchJobId: string
}

type TabType = 'models' | 'documents' | 'attributes' | 'detailed'

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
  const [activeTab, setActiveTab] = useState<TabType>('models')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'models', label: 'Per-Model Analysis' },
    { id: 'documents', label: 'Per-Document Details' },
    { id: 'attributes', label: 'Attribute Failures' },
    { id: 'detailed', label: 'Detailed Results' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{batchJobName}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Batch Processing Results - {analytics.documentResults.length} documents, {analytics.modelAnalytics.length} models
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-primary-600 dark:border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
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
    </div>
  )
}

// ============================================================================
// Per-Model Analysis
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  JSON Valid
                  <InfoIcon tooltip="Level 1: Percentage of runs with valid JSON syntax" className="text-gray-400 dark:text-gray-500" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Attributes
                  <InfoIcon tooltip="Level 2: Percentage with correct field names" className="text-gray-400 dark:text-gray-500" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Formats
                  <InfoIcon tooltip="Level 3: Percentage with correct value formats" className="text-gray-400 dark:text-gray-500" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Avg Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Total Cost
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedModels.map((model) => (
              <tr
                key={model.model}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  selectedModel === model.model ? 'bg-primary-50/50 dark:bg-primary-950/30' : ''
                }`}
                onClick={() => onSelectModel(model.model === selectedModel ? null : model.model)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.model}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {model.successCount + model.failureCount} runs
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {Math.round(model.successRate * 100)}%
                    </span>
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          model.successRate >= 0.8
                            ? 'bg-success-600 dark:bg-success-500'
                            : model.successRate >= 0.5
                            ? 'bg-warning-600 dark:bg-warning-500'
                            : 'bg-error-600 dark:bg-error-500'
                        }`}
                        style={{ width: `${model.successRate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {model.avgExecutionTime}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
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
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{model.model} - Detailed Analysis</h3>

                  {/* 3-Level Validation Breakdown */}
                  {hasValidationData && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Validation Level Breakdown</h4>
                        <InfoIcon tooltip="Progressive validation showing which level this model reaches" />
                      </div>
                      <div className="space-y-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Level 1: JSON Validity</span>
                            <InfoIcon tooltip="Percentage of runs producing valid, parseable JSON" className="text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="flex-1 ml-4 max-w-xs">
                            <ValidationProgressBar percentage={model.jsonValidityRate} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Level 2: Attribute Validity</span>
                            <InfoIcon tooltip="Percentage with correct field names and structure" className="text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="flex-1 ml-4 max-w-xs">
                            <ValidationProgressBar percentage={model.attributeValidityRate} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Level 3: Format Validity</span>
                            <InfoIcon tooltip="Percentage with correct value types and formats" className="text-gray-400 dark:text-gray-500" />
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
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {model.commonErrors.length > 0 ? 'Troubleshooting Guidance' : 'Prompt Improvement Suggestions'}
                        </h4>
                        <InfoIcon tooltip="Specific guidance to resolve errors or improve extraction quality" />
                      </div>
                      <div className="space-y-2">
                        {model.validationBreakdown.commonGuidance.slice(0, 5).map((guidance, idx) => {
                          // Determine guidance type for styling (check for error indicator text, not emojis)
                          const isError = guidance.toLowerCase().includes('error') ||
                                         guidance.toLowerCase().includes('failed') ||
                                         guidance.toLowerCase().includes('invalid')

                          return (
                            <div
                              key={idx}
                              className={`p-3 border rounded text-sm ${
                                isError
                                  ? 'bg-error-50 dark:bg-error-950/30 border-error-200 dark:border-error-800 text-error-900 dark:text-error-100'
                                  : 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-100'
                              }`}
                            >
                              {guidance}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Common Errors - Now Categorized */}
                  {model.commonErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Error Details</h4>
                      <div className="space-y-3">
                        {model.commonErrors.slice(0, 5).map((error, idx) => {
                          // Determine error category for styling
                          const getErrorStyle = (errorText: string) => {
                            if (errorText.includes('[Authentication Error]')) {
                              return { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-100' }
                            }
                            if (errorText.includes('[Rate Limit]')) {
                              return { bg: 'bg-warning-50 dark:bg-warning-950/30', border: 'border-warning-200 dark:border-warning-800', text: 'text-warning-900 dark:text-warning-100' }
                            }
                            if (errorText.includes('[Timeout]')) {
                              return { bg: 'bg-warning-50 dark:bg-warning-950/30', border: 'border-warning-200 dark:border-warning-800', text: 'text-warning-900 dark:text-warning-100' }
                            }
                            if (errorText.includes('[Invalid Model Name]')) {
                              return { bg: 'bg-primary-50 dark:bg-primary-950/30', border: 'border-primary-200 dark:border-primary-800', text: 'text-primary-900 dark:text-primary-100' }
                            }
                            if (errorText.includes('[Model Unavailable]')) {
                              return { bg: 'bg-error-50 dark:bg-error-950/30', border: 'border-error-200 dark:border-error-800', text: 'text-error-900 dark:text-error-100' }
                            }
                            if (errorText.includes('[Invalid Request]')) {
                              return { bg: 'bg-error-50 dark:bg-error-950/30', border: 'border-error-200 dark:border-error-800', text: 'text-error-900 dark:text-error-100' }
                            }
                            if (errorText.includes('[Server Error]')) {
                              return { bg: 'bg-error-50 dark:bg-error-950/30', border: 'border-error-200 dark:border-error-800', text: 'text-error-900 dark:text-error-100' }
                            }
                            if (errorText.includes('[Network Error]')) {
                              return { bg: 'bg-primary-50 dark:bg-primary-950/30', border: 'border-primary-200 dark:border-primary-800', text: 'text-primary-900 dark:text-primary-100' }
                            }
                            if (errorText.includes('[Model Not Found]')) {
                              return { bg: 'bg-primary-50 dark:bg-primary-950/30', border: 'border-primary-200 dark:border-primary-800', text: 'text-primary-900 dark:text-primary-100' }
                            }
                            return { bg: 'bg-gray-50 dark:bg-gray-900', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-900 dark:text-gray-100' }
                          }

                          const style = getErrorStyle(error.error)

                          return (
                            <div key={idx} className={`p-4 ${style.bg} border ${style.border} rounded-lg`}>
                              <p className={`font-medium ${style.text} text-sm`}>
                                {error.error.replace(/^\[.*?\]\s*/, '')}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                Occurred {error.count} time{error.count > 1 ? 's' : ''}
                                {error.documents && error.documents.length > 0 && (
                                  <> in {error.documents.length} document{error.documents.length > 1 ? 's' : ''}</>
                                )}
                              </p>
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
// Per-Document Details
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
      case 'all_passed': return 'bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-100 border-success-200 dark:border-success-800'
      case 'partial': return 'bg-warning-100 dark:bg-warning-950/30 text-warning-800 dark:text-warning-100 border-warning-200 dark:border-warning-800'
      case 'all_failed': return 'bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100 border-error-200 dark:border-error-800'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700'
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
          className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Models Passed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDocs.map((doc) => (
              <tr key={doc.documentId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.filename}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {doc.modelsPassedCount} / {doc.modelsTotalCount}
                    </span>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full"
                        style={{
                          width: `${(doc.modelsPassedCount / doc.modelsTotalCount) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(doc.status)}`}>
                    {doc.status === 'all_passed' && 'All Passed'}
                    {doc.status === 'partial' && 'Partial'}
                    {doc.status === 'all_failed' && 'All Failed'}
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
// Attribute Failures
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
      <div className="text-center py-12 bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800 rounded-lg">
        <p className="text-lg font-semibold text-success-900 dark:text-success-100">Perfect Extraction</p>
        <p className="text-sm text-success-700 dark:text-success-300 mt-2">All models successfully validated all attributes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <InfoIcon tooltip="Attribute failure insights" className="text-primary-700 dark:text-primary-300 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">Attribute Failure Analysis</p>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
              Identifies which schema attributes are most problematic across all models and documents.
              Use these insights to refine your prompts, schemas, or verify data exists in source documents.
            </p>
          </div>
        </div>
      </div>

      {/* Failures Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Attribute Path
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Validation Level
                  <InfoIcon tooltip="Which validation level this failure belongs to" className="text-gray-400 dark:text-gray-500" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Missing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Type Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Format Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Affected Models
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Pattern Insight
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {attributeFailures.map((failure) => {
              const totalFailures = failure.missingCount + failure.typeMismatchCount + failure.formatViolationCount
              const isUniversal = failure.affectedModels.length === totalModels

              // Determine primary validation level
              const getPrimaryLevel = () => {
                if (failure.missingCount > 0) return { level: 'Level 2', label: 'Attributes', color: 'bg-warning-100 dark:bg-warning-950/30 text-warning-800 dark:text-warning-100 border-warning-200 dark:border-warning-800' }
                if (failure.typeMismatchCount > 0 || failure.formatViolationCount > 0) return { level: 'Level 3', label: 'Formats', color: 'bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100 border-error-200 dark:border-error-800' }
                return { level: 'Unknown', label: 'Unknown', color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700' }
              }
              const primaryLevel = getPrimaryLevel()

              return (
                <tr key={failure.attributePath} className={isUniversal ? 'bg-error-50 dark:bg-error-950/20' : ''}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                      {failure.attributePath || '(root)'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
                      <span className="px-2 py-1 text-xs font-semibold bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100 rounded">
                        {failure.missingCount}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {failure.typeMismatchCount > 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-warning-100 dark:bg-warning-950/30 text-warning-800 dark:text-warning-100 rounded">
                        {failure.typeMismatchCount}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {failure.formatViolationCount > 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100 rounded">
                        {failure.formatViolationCount}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {failure.affectedModels.length} / {totalModels}
                    {isUniversal && (
                      <span className="ml-2 text-xs font-semibold text-error-600 dark:text-error-400">ALL</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
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
// Detailed Results
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
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">No outputs found</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
      <div className="bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">Detailed Results</h3>
        <p className="text-sm text-primary-800 dark:text-primary-200">
          Full transparency into each LLM response: prompts sent, raw responses, extracted JSON, and schema comparison.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
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
