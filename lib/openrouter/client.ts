import { extractionJsonSchema } from '../schemas/extraction'

export interface ModelConfig {
  provider: string
  name: string
  displayName: string
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  response_format?: {
    type: 'json_object'
    schema?: object
  }
  temperature?: number
  max_tokens?: number
}

export interface OpenRouterResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ModelExecutionResult {
  model: string
  success: boolean
  response?: string
  jsonPayload?: any
  jsonValid: boolean
  tokensIn?: number
  tokensOut?: number
  costIn?: number
  costOut?: number
  executionTimeMs: number
  errorMessage?: string
}

export class OpenRouterClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = 'https://openrouter.ai/api/v1'
  }

  async executeModel(
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
    useJsonMode: boolean = true
  ): Promise<ModelExecutionResult> {
    const startTime = Date.now()

    try {
      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]

      const requestBody: OpenRouterRequest = {
        model: modelName,
        messages,
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4000,
      }

      // Add JSON mode if supported
      if (useJsonMode) {
        requestBody.response_format = {
          type: 'json_object',
          schema: extractionJsonSchema,
        }
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'LLM Document Analysis',
        },
        body: JSON.stringify(requestBody),
      })

      const executionTimeMs = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        return {
          model: modelName,
          success: false,
          jsonValid: false,
          executionTimeMs,
          errorMessage: `HTTP ${response.status}: ${error}`,
        }
      }

      const data: OpenRouterResponse = await response.json()
      const content = data.choices[0]?.message?.content || ''

      // Try to parse JSON
      let jsonPayload: any = null
      let jsonValid = false

      try {
        jsonPayload = JSON.parse(content)
        jsonValid = true
      } catch (e) {
        jsonValid = false
      }

      // Calculate costs (OpenRouter returns usage data)
      const tokensIn = data.usage.prompt_tokens
      const tokensOut = data.usage.completion_tokens

      return {
        model: modelName,
        success: true,
        response: content,
        jsonPayload,
        jsonValid,
        tokensIn,
        tokensOut,
        executionTimeMs,
      }
    } catch (error) {
      const executionTimeMs = Date.now() - startTime
      return {
        model: modelName,
        success: false,
        jsonValid: false,
        executionTimeMs,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async executeMultipleModels(
    modelNames: string[],
    systemPrompt: string,
    userPrompt: string,
    modelConfigs: Map<string, { supportsJsonMode: boolean; priceIn: number; priceOut: number }>
  ): Promise<ModelExecutionResult[]> {
    // Execute all models in parallel
    const promises = modelNames.map(async (modelName) => {
      const config = modelConfigs.get(modelName)
      const supportsJsonMode = config?.supportsJsonMode ?? false

      const result = await this.executeModel(
        modelName,
        systemPrompt,
        userPrompt,
        supportsJsonMode
      )

      // Add cost calculation
      if (result.tokensIn && result.tokensOut && config) {
        result.costIn = result.tokensIn * config.priceIn
        result.costOut = result.tokensOut * config.priceOut
      }

      return result
    })

    return Promise.all(promises)
  }
}

// Helper function to create client
export function createOpenRouterClient(apiKey?: string): OpenRouterClient {
  const key = apiKey || process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error('OpenRouter API key is required')
  }
  return new OpenRouterClient(key)
}
