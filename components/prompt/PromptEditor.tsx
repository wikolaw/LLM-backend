'use client'

import { useState } from 'react'
import { getSystemPrompt, FORMAT_RECOMMENDATIONS, type OutputFormat } from '@/lib/schemas/extraction'
import { isValidJSONSchema } from '@/lib/validation/schema-validator'

interface PromptEditorProps {
  onConfigChange: (config: {
    outputFormat: OutputFormat
    systemPrompt: string
    userPrompt: string
    validationSchema: object
  }) => void
}

export function PromptEditor({ onConfigChange }: PromptEditorProps) {
  // Step 1: Format selection
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json')

  // Step 2: User's basic extraction requirements
  const [userInput, setUserInput] = useState('')

  // Step 3: AI-optimized prompt
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Step 4: JSON Schema
  const [jsonSchema, setJsonSchema] = useState<object | null>(null)
  const [jsonSchemaText, setJsonSchemaText] = useState('')
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false)
  const [schemaValid, setSchemaValid] = useState(true)
  const [schemaError, setSchemaError] = useState('')

  const systemPrompt = getSystemPrompt(outputFormat)
  const formatRec = FORMAT_RECOMMENDATIONS[outputFormat]

  const handleFormatChange = (format: OutputFormat) => {
    setOutputFormat(format)
    // Notify parent if we have complete config
    if (optimizedPrompt && jsonSchema) {
      onConfigChange({
        outputFormat: format,
        systemPrompt: getSystemPrompt(format),
        userPrompt: optimizedPrompt,
        validationSchema: jsonSchema
      })
    }
  }

  const handleOptimizePrompt = async () => {
    if (!userInput.trim()) {
      alert('Please enter what you want to extract')
      return
    }

    setIsOptimizing(true)
    try {
      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: userInput, outputFormat })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to optimize prompt')
      }

      const { optimizedPrompt } = await response.json()
      setOptimizedPrompt(optimizedPrompt)
    } catch (error) {
      alert(`Failed to optimize prompt: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleGenerateSchema = async () => {
    if (!optimizedPrompt) {
      alert('Please optimize the prompt first')
      return
    }

    setIsGeneratingSchema(true)
    try {
      const response = await fetch('/api/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: userInput,
          optimizedPrompt,
          outputFormat
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate schema')
      }

      const { schema } = await response.json()
      setJsonSchema(schema)
      setJsonSchemaText(JSON.stringify(schema, null, 2))
      setSchemaValid(true)
      setSchemaError('')

      // Notify parent - config is now complete
      onConfigChange({
        outputFormat,
        systemPrompt,
        userPrompt: optimizedPrompt,
        validationSchema: schema
      })
    } catch (error) {
      alert(`Failed to generate schema: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingSchema(false)
    }
  }

  const handleSchemaEdit = (text: string) => {
    setJsonSchemaText(text)

    try {
      const parsed = JSON.parse(text)
      const valid = isValidJSONSchema(parsed)

      if (valid) {
        setJsonSchema(parsed)
        setSchemaValid(true)
        setSchemaError('')

        // Update parent
        onConfigChange({
          outputFormat,
          systemPrompt,
          userPrompt: optimizedPrompt,
          validationSchema: parsed
        })
      } else {
        setSchemaValid(false)
        setSchemaError('Not a valid JSON Schema')
      }
    } catch (e) {
      setSchemaValid(false)
      setSchemaError('Invalid JSON syntax')
    }
  }

  const handleOptimizedPromptEdit = (text: string) => {
    setOptimizedPrompt(text)

    // Update parent if schema exists
    if (jsonSchema) {
      onConfigChange({
        outputFormat,
        systemPrompt,
        userPrompt: text,
        validationSchema: jsonSchema
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Output Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          1. Choose Output Format
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleFormatChange('json')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              outputFormat === 'json'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold text-gray-900 mb-1">{formatRec.title}</div>
            <div className="text-sm text-gray-600 mb-2">{formatRec.description}</div>
            <ul className="text-xs text-gray-500 space-y-1">
              {formatRec.pros.map((pro, i) => (
                <li key={i}>✓ {pro}</li>
              ))}
            </ul>
          </button>

          <button
            onClick={() => handleFormatChange('jsonl')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              outputFormat === 'jsonl'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold text-gray-900 mb-1">
              {FORMAT_RECOMMENDATIONS.jsonl.title}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {FORMAT_RECOMMENDATIONS.jsonl.description}
            </div>
            <ul className="text-xs text-gray-500 space-y-1">
              {FORMAT_RECOMMENDATIONS.jsonl.pros.map((pro, i) => (
                <li key={i}>✓ {pro}</li>
              ))}
            </ul>
          </button>
        </div>
      </div>

      {/* Step 2: User Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          2. What do you want to extract?
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Example: Extract contract name, parties, dates, and monetary values from Swedish railway infrastructure contracts"
          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Describe the information you want to extract in plain language
          </p>
          <button
            onClick={handleOptimizePrompt}
            disabled={!userInput.trim() || isOptimizing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isOptimizing ? 'Optimizing...' : '✨ Optimize Prompt with AI'}
          </button>
        </div>
      </div>

      {/* Step 3: Optimized Prompt (appears after optimization) */}
      {optimizedPrompt && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. Optimized Extraction Prompt (editable)
          </label>
          <textarea
            value={optimizedPrompt}
            onChange={(e) => handleOptimizedPromptEdit(e.target.value)}
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              AI-enhanced prompt with explicit fields, types, and format requirements
            </p>
            <button
              onClick={handleGenerateSchema}
              disabled={isGeneratingSchema}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isGeneratingSchema ? 'Generating...' : '🔧 Generate JSON Schema'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: JSON Schema (appears after generation) */}
      {jsonSchema && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            4. JSON Schema for Validation (editable)
          </label>
          {!schemaValid && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ {schemaError}. Please fix the JSON syntax.
              </p>
            </div>
          )}
          <textarea
            value={jsonSchemaText}
            onChange={(e) => handleSchemaEdit(e.target.value)}
            className={`w-full h-64 p-3 border rounded-lg focus:ring-2 focus:border-transparent font-mono text-xs ${
              schemaValid
                ? 'border-gray-300 focus:ring-green-500'
                : 'border-red-300 bg-red-50 focus:ring-red-500'
            }`}
          />
          <p className="text-xs text-gray-500 mt-2">
            This schema will validate all LLM responses. Make sure it matches your extraction requirements.
          </p>
        </div>
      )}

      {/* System Prompt Preview (read-only) */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
          View System Prompt (auto-generated)
        </summary>
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
            {systemPrompt}
          </pre>
        </div>
      </details>

      {/* Configuration Status */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Configuration Status</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✓ Output format: <strong>{outputFormat.toUpperCase()}</strong></li>
          <li>
            {optimizedPrompt ? '✓' : '○'} Optimized prompt: {optimizedPrompt ? 'Ready' : 'Pending'}
          </li>
          <li>
            {jsonSchema ? '✓' : '○'} JSON Schema: {jsonSchema ? (schemaValid ? 'Valid' : 'Invalid') : 'Pending'}
          </li>
          <li className="mt-2 pt-2 border-t border-blue-300">
            {optimizedPrompt && jsonSchema && schemaValid
              ? '✅ Ready to run models'
              : '⏳ Complete all steps to continue'}
          </li>
        </ul>
      </div>
    </div>
  )
}
