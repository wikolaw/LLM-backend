'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import { InfoIcon } from '@/components/ui/InfoIcon'
import { Tooltip } from '@/components/ui/Tooltip'

type Model = Database['public']['Tables']['models']['Row']

interface ModelSelectorProps {
  onSelectionChange: (selectedModels: Model[]) => void
  estimatedTokens?: number
}

export function ModelSelector({ onSelectionChange, estimatedTokens = 1000 }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('enabled', true)
        .order('price_in', { ascending: true })

      if (error) throw error
      setModels(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId)
    } else {
      newSelected.add(modelId)
    }
    setSelectedIds(newSelected)

    const selectedModels = models.filter(m => newSelected.has(m.id))
    onSelectionChange(selectedModels)
  }

  const selectAll = () => {
    const allIds = new Set(models.map(m => m.id))
    setSelectedIds(allIds)
    onSelectionChange(models)
  }

  const selectNone = () => {
    setSelectedIds(new Set())
    onSelectionChange([])
  }

  const selectFree = () => {
    const freeModels = models.filter(m => parseFloat(m.price_in.toString()) === 0)
    const freeIds = new Set(freeModels.map(m => m.id))
    setSelectedIds(freeIds)
    onSelectionChange(freeModels)
  }

  // Group models
  const freeModels = models.filter(m => parseFloat(m.price_in.toString()) === 0)
  const budgetModels = models.filter(m => {
    const price = parseFloat(m.price_in.toString())
    return price > 0 && price < 0.000001
  })
  const premiumModels = models.filter(m => parseFloat(m.price_in.toString()) >= 0.000001)

  // Calculate estimated cost
  const selectedModels = models.filter(m => selectedIds.has(m.id))
  const totalEstimatedCost = selectedModels.reduce((sum, model) => {
    const costIn = parseFloat(model.price_in.toString()) * estimatedTokens
    const costOut = parseFloat(model.price_out.toString()) * (estimatedTokens * 0.5) // Assume output is ~50% of input
    return sum + costIn + costOut
  }, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Error loading models: {error}</p>
      </div>
    )
  }

  const ModelCard = ({ model }: { model: Model }) => {
    const isSelected = selectedIds.has(model.id)
    const price = parseFloat(model.price_in.toString())
    const isFree = price === 0

    return (
      <div
        onClick={() => toggleModel(model.id)}
        className={`
          p-4 border-2 rounded-lg cursor-pointer transition-all
          ${isSelected
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
          }
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleModel(model.id)}
                className="w-4 h-4 text-blue-600 rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <h4 className="font-medium text-gray-900">{model.display_name}</h4>
              {isFree && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">
                  FREE
                </span>
              )}
              {model.supports_json_mode && (
                <Tooltip content="This model natively supports JSON mode for more reliable structured output">
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded cursor-help">
                    JSON
                  </span>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {model.provider} / {model.name}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-gray-700">
              <span>Context: {(model.context_window / 1000).toFixed(0)}K</span>
              {!isFree && (
                <span>
                  ${(parseFloat(model.price_in.toString()) * 1000000).toFixed(2)} / 1M tokens
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={selectFree}
            className="px-3 py-1.5 text-sm border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
          >
            Select Free Models
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{selectedIds.size}</span> model{selectedIds.size !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Cost Estimate */}
      {selectedIds.size > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-yellow-900">Estimated Cost Per Run</h4>
              <InfoIcon
                tooltip={`Calculation based on ~${estimatedTokens.toLocaleString()} input tokens and ~${Math.round(estimatedTokens * 0.5).toLocaleString()} estimated output tokens (50% of input). Actual costs depend on model response length.`}
                className="text-yellow-700"
              />
            </div>
            <div className="text-2xl font-bold text-yellow-900">
              ${totalEstimatedCost.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Free Models */}
      {freeModels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Free Models ({freeModels.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freeModels.map(model => <ModelCard key={model.id} model={model} />)}
          </div>
        </div>
      )}

      {/* Budget Models */}
      {budgetModels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Budget Models ({budgetModels.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {budgetModels.map(model => <ModelCard key={model.id} model={model} />)}
          </div>
        </div>
      )}

      {/* Premium Models */}
      {premiumModels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Premium Models ({premiumModels.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {premiumModels.map(model => <ModelCard key={model.id} model={model} />)}
          </div>
        </div>
      )}

      {models.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No models available. Please check your database configuration.
        </div>
      )}
    </div>
  )
}
