'use client'

import { useState } from 'react'
import { InfoIcon } from '@/components/ui/InfoIcon'

// Types
interface GlobalSummary {
  totalDocuments: number
  totalRuns: number
  successRate: number
  totalCost: number
  avgExecutionTime: number
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
}

type TabType = 'summary' | 'models' | 'documents' | 'attributes'

export function BatchResults({ analytics, batchJobName }: BatchResultsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'summary', label: 'Global Summary', icon: '📊' },
    { id: 'models', label: 'Per-Model Analysis', icon: '🤖' },
    { id: 'documents', label: 'Per-Document Details', icon: '📄' },
    { id: 'attributes', label: 'Attribute Failures', icon: '🔍' }
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
          <GlobalSummaryTab summary={analytics.globalSummary} modelAnalytics={analytics.modelAnalytics} />
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
      </div>
    </div>
  )
}

// ============================================================================
// Tab 1: Global Summary
// ============================================================================

function GlobalSummaryTab({
  summary,
  modelAnalytics
}: {
  summary: GlobalSummary
  modelAnalytics: ModelAnalytics[]
}) {
  const topModels = [...modelAnalytics]
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 3)

  return (
    <div className="space-y-6">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Common Failures
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {model.avgExecutionTime}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${model.totalCost.toFixed(6)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {model.commonErrors.length > 0
                    ? `${model.commonErrors[0].error.substring(0, 50)}...`
                    : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model Details */}
      {selectedModel && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          {(() => {
            const model = modelAnalytics.find(m => m.model === selectedModel)
            if (!model) return null

            return (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">{model.model} - Detailed Analysis</h3>

                {model.commonErrors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Common Errors</h4>
                    <div className="space-y-2">
                      {model.commonErrors.slice(0, 5).map((error, idx) => (
                        <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                          <p className="font-medium text-red-900">
                            {error.error}
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Occurred {error.count} time{error.count > 1 ? 's' : ''}
                            {error.documents && error.documents.length > 0 && (
                              <> in {error.documents.length} document{error.documents.length > 1 ? 's' : ''}</>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
          <InfoIcon className="text-blue-700 mt-0.5" />
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
