'use client'

import { useState } from 'react'
import { getSystemPrompt, FORMAT_RECOMMENDATIONS, type OutputFormat } from '@/lib/schemas/extraction'
import { isValidJSONSchema } from '@/lib/validation/schema-validator'
import { InfoIcon } from '@/components/ui/InfoIcon'

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
        <div className="flex items-center gap-2 mb-3">
          <label className="block text-sm font-medium text-gray-700">
            1. Choose Output Format
          </label>
          <InfoIcon tooltip="JSON outputs a single object (best for one record), while JSON Lines outputs multiple objects separated by newlines (best for lists)." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleFormatChange('json')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              outputFormat === 'json'
                ? 'border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{formatRec.title}</div>
              <InfoIcon
                tooltip={
                  <ul className="space-y-1">
                    {formatRec.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                }
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{formatRec.description}</div>
          </button>

          <button
            onClick={() => handleFormatChange('jsonl')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              outputFormat === 'jsonl'
                ? 'border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {FORMAT_RECOMMENDATIONS.jsonl.title}
              </div>
              <InfoIcon
                tooltip={
                  <ul className="space-y-1">
                    {FORMAT_RECOMMENDATIONS.jsonl.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                }
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {FORMAT_RECOMMENDATIONS.jsonl.description}
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: User Input */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            2. What do you want to extract?
          </label>
          <InfoIcon tooltip="Describe the fields you need in natural language. Example: 'Extract contract name, parties, dates, and monetary values.' The AI will optimize this into a structured prompt with explicit types." />
        </div>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Example: Extract contract name, parties, dates, and monetary values from Swedish railway infrastructure contracts"
          className="w-full h-24 p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center justify-end mt-2">
          <button
            onClick={handleOptimizePrompt}
            disabled={!userInput.trim() || isOptimizing}
            className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize Prompt with AI'}
          </button>
        </div>
      </div>

      {/* Step 3: Optimized Prompt (appears after optimization) */}
      {optimizedPrompt && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              3. Optimized Extraction Prompt (editable)
            </label>
            <InfoIcon tooltip="AI has added explicit field names, data types (string, number, object), and format requirements (e.g., YYYY-MM-DD for dates). Edit if needed before generating the schema. This is the USER PROMPT that will be sent to the models." />
          </div>
          <textarea
            value={optimizedPrompt}
            onChange={(e) => handleOptimizedPromptEdit(e.target.value)}
            className="w-full h-40 p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
          />
          <div className="flex items-center justify-end mt-2">
            <button
              onClick={handleGenerateSchema}
              disabled={isGeneratingSchema}
              className="px-4 py-2 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isGeneratingSchema ? 'Generating...' : 'Generate JSON Schema'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: JSON Schema (appears after generation) */}
      {jsonSchema && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              4. JSON Schema for Validation (editable)
            </label>
            <InfoIcon tooltip="This JSON Schema (draft-07) validates all model outputs. All responses must match this structure to pass validation. Edit carefully - invalid schemas will prevent execution." />
          </div>
          {!schemaValid && (
            <div className="mb-2 p-3 bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800 rounded-lg">
              <p className="text-sm text-error-800 dark:text-error-100">
                {schemaError}. Please fix the JSON syntax.
              </p>
            </div>
          )}
          <textarea
            value={jsonSchemaText}
            onChange={(e) => handleSchemaEdit(e.target.value)}
            className={`w-full h-64 p-3 border rounded-lg focus:ring-2 focus:border-transparent font-mono text-xs ${
              schemaValid
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-success-500'
                : 'border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-950/30 text-gray-900 dark:text-gray-100 focus:ring-error-500'
            }`}
          />
        </div>
      )}

      {/* Step 5: Final Prompt Preview (appears after both optimizedPrompt and jsonSchema exist) */}
      {optimizedPrompt && jsonSchema && schemaValid && (
        <div className="border-2 border-success-200 dark:border-success-800 rounded-lg bg-success-50 dark:bg-success-950/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-success-900 dark:text-success-100">
              5. Final Prompt Preview
            </h3>
            <InfoIcon tooltip="This is exactly what will be sent to each model. System Prompt (auto-generated) + User Prompt (from step 3) + your document text." />
          </div>

          <div className="space-y-4">
            {/* System Prompt Section */}
            <div>
              <label className="block text-xs font-semibold text-success-800 dark:text-success-200 uppercase tracking-wide mb-2">
                System Prompt (Auto-Generated by Output Format):
              </label>
              <div className="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                  {systemPrompt}
                </pre>
              </div>
            </div>

            {/* User Prompt Section */}
            <div>
              <label className="block text-xs font-semibold text-success-800 dark:text-success-200 uppercase tracking-wide mb-2">
                User Prompt (From Step 3 - This Is Your Extraction Instructions):
              </label>
              <div className="bg-white dark:bg-gray-800 border-2 border-primary-300 dark:border-primary-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                  {optimizedPrompt}
                </pre>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-success-100 dark:bg-success-950/50 border border-success-300 dark:border-success-800 rounded-lg p-4">
              <p className="text-sm text-success-900 dark:text-success-100">
                <span className="font-semibold">What gets sent to models:</span> The System Prompt above +
                Your User Prompt above + Your Document Text. Each model will receive this combined prompt
                and attempt to extract data matching your JSON Schema (Step 4).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Prompt Preview (read-only) */}
      <details className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          View System Prompt (auto-generated)
        </summary>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {systemPrompt}
          </pre>
        </div>
      </details>

      {/* Configuration Status */}
      <div className="p-4 bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg">
        <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">Configuration Status</h4>
        <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
          <li>Output format: <strong>{outputFormat.toUpperCase()}</strong></li>
          <li>
            {optimizedPrompt ? 'Optimized prompt: Ready' : 'Optimized prompt: Pending'}
          </li>
          <li>
            {jsonSchema ? `JSON Schema: ${schemaValid ? 'Valid' : 'Invalid'}` : 'JSON Schema: Pending'}
          </li>
          <li className="mt-2 pt-2 border-t border-primary-300 dark:border-primary-800">
            {optimizedPrompt && jsonSchema && schemaValid
              ? 'Ready to run models'
              : 'Complete all steps to continue'}
          </li>
        </ul>
      </div>
    </div>
  )
}
