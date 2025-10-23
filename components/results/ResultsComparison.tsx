'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/types'

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
  const validOutputs = outputs.filter(o => o.json_valid)
  const totalCost = outputs.reduce((sum, o) => {
    const costIn = parseFloat(o.cost_in?.toString() || '0')
    const costOut = parseFloat(o.cost_out?.toString() || '0')
    return sum + costIn + costOut
  }, 0)
  const avgExecutionTime = outputs.reduce((sum, o) => sum + (o.execution_time_ms || 0), 0) / outputs.length

  const OutputCard = ({ output }: { output: Output }) => {
    const isExpanded = expandedIds.has(output.id)
    const totalCost = (parseFloat(output.cost_in?.toString() || '0') + parseFloat(output.cost_out?.toString() || '0'))

    return (
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div
          onClick={() => toggleExpanded(output.id)}
          className={`
            p-4 cursor-pointer transition-colors
            ${output.json_valid
              ? 'bg-green-50 hover:bg-green-100 border-b border-green-200'
              : output.error_message
                ? 'bg-red-50 hover:bg-red-100 border-b border-red-200'
                : 'bg-yellow-50 hover:bg-yellow-100 border-b border-yellow-200'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{output.model}</h3>
                {output.json_valid ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-600 text-white rounded">
                    ✓ Valid JSON
                  </span>
                ) : output.error_message ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded">
                    ✗ Error
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-600 text-white rounded">
                    ⚠ Invalid JSON
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                <span>⏱ {output.execution_time_ms}ms</span>
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

            {/* JSON Payload */}
            {output.json_payload && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Extracted Data</h4>
                  {onExport && (
                    <button
                      onClick={() => onExport(output)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Export
                    </button>
                  )}
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
          <p className="text-sm text-green-700">Valid JSON</p>
          <p className="text-2xl font-bold text-green-900">
            {validOutputs.length}/{outputs.length}
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
        {outputs.map(output => (
          <OutputCard key={output.id} output={output} />
        ))}
      </div>
    </div>
  )
}
