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
  const [cloudExpanded, setCloudExpanded] = useState(true)

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
        .order('deployment_type', { ascending: false })
        .order('vram_fp16_gb', { ascending: true })

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

  const selectByDeployment = (deploymentType: 'on-prem' | 'cloud-only') => {
    const filtered = models.filter(m => m.deployment_type === deploymentType)
    const filteredIds = new Set(filtered.map(m => m.id))
    setSelectedIds(filteredIds)
    onSelectionChange(filtered)
  }

  const selectBySize = (size: 'small' | 'medium' | 'large') => {
    const filtered = models.filter(m => m.model_size === size)
    const filteredIds = new Set(filtered.map(m => m.id))
    setSelectedIds(filteredIds)
    onSelectionChange(filtered)
  }

  // Group models by deployment type and size
  const onPremSmall = models.filter(m => m.deployment_type === 'on-prem' && m.model_size === 'small')
  const onPremMedium = models.filter(m => m.deployment_type === 'on-prem' && m.model_size === 'medium')
  const onPremLarge = models.filter(m => m.deployment_type === 'on-prem' && m.model_size === 'large')
  const cloudOnly = models.filter(m => m.deployment_type === 'cloud-only')

  // Calculate estimated cost
  const selectedModels = models.filter(m => selectedIds.has(m.id))
  const totalEstimatedCost = selectedModels.reduce((sum, model) => {
    const costIn = parseFloat(model.price_in.toString()) * estimatedTokens
    const costOut = parseFloat(model.price_out.toString()) * (estimatedTokens * 0.5)
    return sum + costIn + costOut
  }, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800 rounded-lg">
        <p className="text-sm text-error-600 dark:text-error-400">Error loading models: {error}</p>
      </div>
    )
  }

  const ModelCard = ({ model }: { model: Model }) => {
    const isSelected = selectedIds.has(model.id)
    const isOnPrem = model.deployment_type === 'on-prem'
    const pricePerMillion = (parseFloat(model.price_in.toString()) * 1000000).toFixed(3)

    return (
      <div
        onClick={() => toggleModel(model.id)}
        className={`
          p-4 border rounded-lg cursor-pointer transition-all
          ${isSelected
            ? 'border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-950/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
          }
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleModel(model.id)}
                className="w-4 h-4 text-primary-600 dark:text-primary-500 rounded focus:ring-primary-500"
                onClick={(e) => e.stopPropagation()}
              />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{model.display_name}</h4>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {/* Parameter Count Badge */}
              {model.parameter_count && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  {model.parameter_count}
                </span>
              )}

              {/* JSON Mode Badge */}
              {model.supports_json_mode && (
                <Tooltip content="Native JSON mode support for reliable structured output">
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded cursor-help">
                    JSON
                  </span>
                </Tooltip>
              )}

              {/* Context Window */}
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                {(model.context_window / 1000).toFixed(0)}K ctx
              </span>
            </div>

            {/* VRAM Requirements (On-Prem only) */}
            {isOnPrem && model.vram_fp16_gb && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-xs space-y-1">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">VRAM Requirements:</div>
                <div className="grid grid-cols-3 gap-2 text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">FP16:</span> {model.vram_fp16_gb}GB
                  </div>
                  <div>
                    <span className="font-medium">8-bit:</span> {model.vram_8bit_gb}GB
                  </div>
                  <div>
                    <span className="font-medium">4-bit:</span> {model.vram_4bit_gb}GB
                  </div>
                </div>
              </div>
            )}

            {/* Cost (Subtle) */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              ${pricePerMillion} / 1M tokens
            </div>
          </div>
        </div>
      </div>
    )
  }

  const SectionHeader = ({
    title,
    count,
    description,
    onSelect
  }: {
    title: string
    count: number
    description: string
    onSelect?: () => void
  }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title} ({count})
          </h3>
          <Tooltip content={description}>
            <InfoIcon className="text-gray-500 dark:text-gray-400" />
          </Tooltip>
        </div>
      </div>
      {onSelect && count > 0 && (
        <button
          onClick={onSelect}
          className="text-xs px-2 py-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          Select All
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => selectByDeployment('on-prem')}
            className="px-3 py-1.5 text-sm border border-primary-600 dark:border-primary-500 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
          >
            All On-Prem
          </button>
          <button
            onClick={() => selectByDeployment('cloud-only')}
            className="px-3 py-1.5 text-sm border border-primary-600 dark:border-primary-500 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
          >
            All Cloud
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{selectedIds.size}</span> model{selectedIds.size !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Cost Estimate */}
      {selectedIds.size > 0 && (
        <div className="p-4 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-warning-900 dark:text-warning-100">Estimated Cost Per Run</h4>
              <InfoIcon
                tooltip={`Based on ~${estimatedTokens.toLocaleString()} input tokens and ~${Math.round(estimatedTokens * 0.5).toLocaleString()} estimated output tokens. Actual costs vary by response length.`}
                className="text-warning-700 dark:text-warning-300"
              />
            </div>
            <div className="text-2xl font-bold text-warning-900 dark:text-warning-100">
              ${totalEstimatedCost.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* ON-PREM MODELS */}
      {(onPremSmall.length > 0 || onPremMedium.length > 0 || onPremLarge.length > 0) && (
        <div className="space-y-6">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              On-Premises Deployable Models
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Open-weight models that can be self-hosted. VRAM requirements shown for different quantization levels.
            </p>
          </div>

          {/* Small (7-8B) */}
          {onPremSmall.length > 0 && (
            <div>
              <SectionHeader
                title="Small (7-8B)"
                count={onPremSmall.length}
                description="Entry-level models suitable for basic tasks. Typical hardware: RTX 4090 (24GB), A5000 (24GB)"
                onSelect={() => selectBySize('small')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onPremSmall.map(model => <ModelCard key={model.id} model={model} />)}
              </div>
            </div>
          )}

          {/* Medium (30-49B) */}
          {onPremMedium.length > 0 && (
            <div>
              <SectionHeader
                title="Medium (30-49B)"
                count={onPremMedium.length}
                description="Advanced models for complex tasks. Typical hardware: A100 80GB, H100 80GB, or multi-GPU setups"
                onSelect={() => selectBySize('medium')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onPremMedium.map(model => <ModelCard key={model.id} model={model} />)}
              </div>
            </div>
          )}

          {/* Large (70-80B) */}
          {onPremLarge.length > 0 && (
            <div>
              <SectionHeader
                title="Large (70-80B)"
                count={onPremLarge.length}
                description="High-performance models for demanding workloads. Typical hardware: Multi-GPU clusters (2-4x A100/H100)"
                onSelect={() => selectBySize('large')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onPremLarge.map(model => <ModelCard key={model.id} model={model} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLOUD ONLY MODELS */}
      {cloudOnly.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setCloudExpanded(!cloudExpanded)}
          >
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Cloud-Only Models ({cloudOnly.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Proprietary models accessible via API. No hardware requirements - pay per use.
              </p>
            </div>
            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <svg
                className={`w-5 h-5 transition-transform ${cloudExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {cloudExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cloudOnly.map(model => <ModelCard key={model.id} model={model} />)}
            </div>
          )}
        </div>
      )}

      {models.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No models available. Please check your database configuration.
        </div>
      )}
    </div>
  )
}
