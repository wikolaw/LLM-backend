'use client'

import { useState } from 'react'
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_GENERIC,
  DEFAULT_USER_PROMPT_CONTRACT
} from '@/lib/schemas/extraction'

interface PromptEditorProps {
  onPromptsChange: (systemPrompt: string, userPrompt: string, schemaType: 'generic' | 'contract') => void
  initialSystemPrompt?: string
  initialUserPrompt?: string
  initialSchemaType?: 'generic' | 'contract'
}

export function PromptEditor({
  onPromptsChange,
  initialSystemPrompt,
  initialUserPrompt,
  initialSchemaType = 'contract'
}: PromptEditorProps) {
  const [schemaType, setSchemaType] = useState<'generic' | 'contract'>(initialSchemaType)
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt || DEFAULT_SYSTEM_PROMPT)
  const [userPrompt, setUserPrompt] = useState(
    initialUserPrompt || (schemaType === 'contract' ? DEFAULT_USER_PROMPT_CONTRACT : DEFAULT_USER_PROMPT_GENERIC)
  )
  const [showPreview, setShowPreview] = useState(false)

  const handleSchemaChange = (type: 'generic' | 'contract') => {
    setSchemaType(type)
    const newUserPrompt = type === 'contract' ? DEFAULT_USER_PROMPT_CONTRACT : DEFAULT_USER_PROMPT_GENERIC
    setUserPrompt(newUserPrompt)
    onPromptsChange(systemPrompt, newUserPrompt, type)
  }

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value)
    onPromptsChange(value, userPrompt, schemaType)
  }

  const handleUserPromptChange = (value: string) => {
    setUserPrompt(value)
    onPromptsChange(systemPrompt, value, schemaType)
  }

  const estimateTokens = (text: string) => {
    // Rough estimate: 1 token ≈ 4 characters for English, ~3 for Swedish
    return Math.ceil(text.length / 3.5)
  }

  const totalTokenEstimate = estimateTokens(systemPrompt + userPrompt)

  return (
    <div className="space-y-6">
      {/* Schema Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Extraction Schema Type
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => handleSchemaChange('generic')}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              schemaType === 'generic'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Generic Document
          </button>
          <button
            onClick={() => handleSchemaChange('contract')}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              schemaType === 'contract'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Swedish Contract (Railway)
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {schemaType === 'generic'
            ? 'Extracts: entities, dates, amounts, summary, language, topics'
            : 'Extracts: allmän info, parter, ekonomi, infrastruktur, ansvar, kvalitet, ändringar, bilagor'
          }
        </p>
      </div>

      {/* System Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            System Prompt
          </label>
          <span className="text-xs text-gray-500">
            ~{estimateTokens(systemPrompt)} tokens
          </span>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => handleSystemPromptChange(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Enter system prompt..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Defines the AI's role and behavior. This sets the context for extraction.
        </p>
      </div>

      {/* User Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            User Prompt Template
          </label>
          <span className="text-xs text-gray-500">
            ~{estimateTokens(userPrompt)} tokens (+ document length)
          </span>
        </div>
        <textarea
          value={userPrompt}
          onChange={(e) => handleUserPromptChange(e.target.value)}
          className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Enter user prompt template..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{ DOCUMENT_TEXT}'}</code> as placeholder for the document content.
        </p>
      </div>

      {/* Token Estimate */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-900">Total Prompt Tokens (estimated)</h4>
            <p className="text-xs text-blue-700 mt-1">
              Actual cost depends on document length and model response
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            ~{totalTokenEstimate.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Preview Toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        {showPreview ? 'Hide' : 'Show'} Full Prompt Preview
      </button>

      {/* Preview */}
      {showPreview && (
        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Prompt Preview</h4>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">SYSTEM:</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                {systemPrompt}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">USER:</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                {userPrompt}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
            const defaultUser = schemaType === 'contract' ? DEFAULT_USER_PROMPT_CONTRACT : DEFAULT_USER_PROMPT_GENERIC
            setUserPrompt(defaultUser)
            onPromptsChange(DEFAULT_SYSTEM_PROMPT, defaultUser, schemaType)
          }}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
