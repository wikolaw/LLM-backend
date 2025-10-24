'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/types'
import { formatValidationErrors } from '@/lib/validation/schema-validator'

type Output = Database['public']['Tables']['outputs']['Row']

interface ResultsComparisonProps {
  outputs: Output[]
  onExport?: (output: Output) => void
}

export function ResultsComparison({ outputs, onExport }: ResultsComparisonProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (outputs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No results yet</p>
        <p className="text-sm mt-2">Run the inference to see model outputs here</p>
      </div>
    )
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const expandAll = () => {
    setExpandedIds(new Set(outputs.map(o => o.id)))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  // Calculate statistics
  const validatedOutputs = outputs.filter(o => o.validation_passed)
  const totalCost = outputs.reduce((sum, o) => {
    const costIn = parseFloat(o.cost_in?.toString() || '0')
    const costOut = parseFloat(o.cost_out?.toString() || '0')
    return sum + costIn + costOut
  }, 0)
  const avgExecutionTime = outputs.reduce((sum, o) => sum + (o.execution_time_ms || 0), 0) / outputs.length

  // Sort outputs: validated first, then by execution time
  const sortedOutputs = [...outputs].sort((a, b) => {
    if (a.validation_passed && !b.validation_passed) return -1
    if (!a.validation_passed && b.validation_passed) return 1
    return (a.execution_time_ms || 0) - (b.execution_time_ms || 0)
  })

  const OutputCard = ({ output }: { output: Output }) => {
    const isExpanded = expandedIds.has(output.id)
    const totalCost = (parseFloat(output.cost_in?.toString() || '0') + parseFloat(output.cost_out?.toString() || '0'))

    const getStatusColor = () => {
      if (output.error_message) return 'red'
      if (output.validation_passed) return 'green'
      if (output.json_valid) return 'yellow'
      return 'red'
    }

    const statusColor = getStatusColor()

    return (
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div
          onClick={() => toggleExpanded(output.id)}
          className={`
            p-4 cursor-pointer transition-colors
            ${statusColor === 'green'
              ? 'bg-green-50 hover:bg-green-100 border-b border-green-200'
              : statusColor === 'yellow'
                ? 'bg-yellow-50 hover:bg-yellow-100 border-b border-yellow-200'
                : 'bg-red-50 hover:bg-red-100 border-b border-red-200'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{output.model}</h3>

                {/* Validation Status Badge */}
                {output.validation_passed ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-600 text-white rounded">
                    ✅ Validated
                  </span>
                ) : output.error_message ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded">
                    ❌ Error
                  </span>
                ) : output.json_valid ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-600 text-white rounded">
                    ⚠️ Validation Failed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded">
                    ❌ Invalid JSON
                  </span>
                )}

                {/* Output Format Badge */}
                {output.output_format && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                    {output.output_format.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                <span>⏱️ {output.execution_time_ms}ms</span>
                {output.tokens_in && (
                  <span>📥 {output.tokens_in.toLocaleString()} tokens in</span>
                )}
                {output.tokens_out && (
                  <span>📤 {output.tokens_out.toLocaleString()} tokens out</span>
                )}
                {totalCost > 0 && (
                  <span>💰 ${totalCost.toFixed(6)}</span>
                )}
              </div>
            </div>

            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {/* Body */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Error Message */}
            {output.error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{output.error_message}</p>
              </div>
            )}

            {/* Validation Errors */}
            {!output.validation_passed && output.validation_errors && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium text-yellow-900">Validation Errors</p>
                <pre className="text-xs text-yellow-800 mt-2 whitespace-pre-wrap font-mono">
                  {JSON.stringify(output.validation_errors, null, 2)}
                </pre>
              </div>
            )}

            {/* JSON Payload */}
            {output.json_payload && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Extracted Data</h4>
                  <div className="flex gap-2">
                    {output.validation_passed && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        ✓ Schema Valid
                      </span>
                    )}
                    {onExport && (
                      <button
                        onClick={() => onExport(output)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Export
                      </button>
                    )}
                  </div>
                </div>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(output.json_payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Raw Response */}
            {output.raw_response && !output.json_valid && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Response</h4>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {output.raw_response}
                </pre>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Metadata</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-gray-500">Created:</dt>
                <dd className="text-gray-900">{new Date(output.created_at).toLocaleString()}</dd>
                <dt className="text-gray-500">Format:</dt>
                <dd className="text-gray-900">{output.output_format?.toUpperCase() || 'N/A'}</dd>
                {output.tokens_in && (
                  <>
                    <dt className="text-gray-500">Input Tokens:</dt>
                    <dd className="text-gray-900">{output.tokens_in.toLocaleString()}</dd>
                  </>
                )}
                {output.tokens_out && (
                  <>
                    <dt className="text-gray-500">Output Tokens:</dt>
                    <dd className="text-gray-900">{output.tokens_out.toLocaleString()}</dd>
                  </>
                )}
                {output.cost_in && (
                  <>
                    <dt className="text-gray-500">Input Cost:</dt>
                    <dd className="text-gray-900">${parseFloat(output.cost_in.toString()).toFixed(6)}</dd>
                  </>
                )}
                {output.cost_out && (
                  <>
                    <dt className="text-gray-500">Output Cost:</dt>
                    <dd className="text-gray-900">${parseFloat(output.cost_out.toString()).toFixed(6)}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <p className="text-sm text-gray-500">Total Models</p>
          <p className="text-2xl font-bold text-gray-900">{outputs.length}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Validated</p>
          <p className="text-2xl font-bold text-green-900">
            {validatedOutputs.length}/{outputs.length}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {Math.round((validatedOutputs.length / outputs.length) * 100)}% success rate
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Avg Time</p>
          <p className="text-2xl font-bold text-blue-900">{Math.round(avgExecutionTime)}ms</p>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">Total Cost</p>
          <p className="text-2xl font-bold text-yellow-900">${totalCost.toFixed(4)}</p>
        </div>
      </div>

      {/* Best Result Highlight */}
      {validatedOutputs.length > 0 && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h3 className="font-semibold text-green-900">Best Result</h3>
          </div>
          <p className="text-sm text-green-800">
            <strong>{sortedOutputs[0].model}</strong> - Validated in {sortedOutputs[0].execution_time_ms}ms
          </p>
          <p className="text-xs text-green-700 mt-1">
            All validated results passed JSON Schema validation successfully
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Collapse All
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-sm border rounded-lg ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm border rounded-lg ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Results */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
        {sortedOutputs.map(output => (
          <OutputCard key={output.id} output={output} />
        ))}
      </div>
    </div>
  )
}
