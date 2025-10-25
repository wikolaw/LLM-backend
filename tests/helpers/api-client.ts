/**
 * API Client for Non-UI Tests
 * Wrapper around Playwright's APIRequestContext for type-safe API calls
 */

import { APIRequestContext } from '@playwright/test'
import { AuthSession, getAuthHeaders } from './auth-helper'
import type { OutputFormat } from '../../lib/schemas/extraction'

export class APIClient {
  constructor(
    private request: APIRequestContext,
    private baseURL: string = 'http://localhost:3000',
    private session?: AuthSession
  ) {}

  /**
   * Set authentication session
   */
  setAuth(session: AuthSession) {
    this.session = session
  }

  /**
   * Get common headers (with auth if available)
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.session) {
      return { ...headers, ...getAuthHeaders(this.session) }
    }
    return headers
  }

  // ============================================================================
  // Document Upload API
  // ============================================================================

  /**
   * Upload documents (multipart/form-data)
   * Returns array of document IDs
   */
  async uploadDocuments(filePaths: string[]): Promise<string[]> {
    const formData = new FormData()

    // Note: This is a placeholder - actual implementation depends on your upload API
    // You may need to use fetch with FormData or implement document upload endpoint
    throw new Error('Document upload via API not yet implemented - use direct DB seeding')
  }

  // ============================================================================
  // Prompt Optimization API
  // ============================================================================

  /**
   * POST /api/optimize-prompt
   * Optimize user prompt with AI (GPT-4o-mini)
   */
  async optimizePrompt(
    userPrompt: string,
    outputFormat: OutputFormat = 'json'
  ): Promise<string> {
    const response = await this.request.post(`${this.baseURL}/api/optimize-prompt`, {
      data: {
        userPrompt,
        outputFormat
      },
      headers: this.getHeaders()
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Optimize prompt failed: ${response.status()} - ${error}`)
    }

    const data = await response.json()
    return data.optimizedPrompt
  }

  // ============================================================================
  // Schema Generation API
  // ============================================================================

  /**
   * POST /api/generate-schema
   * Generate JSON Schema from prompts using AI
   */
  async generateSchema(
    userPrompt: string,
    optimizedPrompt: string,
    outputFormat: OutputFormat = 'json'
  ): Promise<object> {
    const response = await this.request.post(`${this.baseURL}/api/generate-schema`, {
      data: {
        userPrompt,
        optimizedPrompt,
        outputFormat
      },
      headers: this.getHeaders()
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Generate schema failed: ${response.status()} - ${error}`)
    }

    const data = await response.json()
    return data.schema
  }

  // ============================================================================
  // Batch Job APIs
  // ============================================================================

  /**
   * POST /api/batch/create
   * Create a new batch job
   */
  async createBatch(params: {
    documentIds: string[]
    name: string
    systemPrompt: string
    userPrompt: string
    outputFormat: OutputFormat
    validationSchema: object
    models: string[]
  }): Promise<string> {
    const response = await this.request.post(`${this.baseURL}/api/batch/create`, {
      data: params,
      headers: this.getHeaders()
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Create batch failed: ${response.status()} - ${error}`)
    }

    const data = await response.json()
    return data.batchJobId
  }

  /**
   * POST /api/batch/start
   * Start batch processing (triggers Edge Function)
   */
  async startBatch(batchJobId: string): Promise<void> {
    const response = await this.request.post(`${this.baseURL}/api/batch/start`, {
      data: { batchJobId },
      headers: this.getHeaders()
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Start batch failed: ${response.status()} - ${error}`)
    }
  }

  /**
   * GET /api/batch/[id]/status
   * Get batch job status
   */
  async getBatchStatus(batchJobId: string): Promise<BatchStatus> {
    const response = await this.request.get(`${this.baseURL}/api/batch/${batchJobId}/status`, {
      headers: this.getHeaders()
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Get batch status failed: ${response.status()} - ${error}`)
    }

    return await response.json()
  }

  /**
   * GET /api/batch/[id]/analytics
   * Get batch analytics (after completion)
   */
  async getBatchAnalytics(batchJobId: string): Promise<BatchAnalytics> {
    const response = await this.request.get(`${this.baseURL}/api/batch/${batchJobId}/analytics`, {
      headers: this.getHeaders()
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Get batch analytics failed: ${response.status()} - ${error}`)
    }

    return await response.json()
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Poll batch status until completed or timeout
   */
  async pollUntilComplete(
    batchJobId: string,
    options: {
      timeout?: number // milliseconds (default: 5 minutes)
      interval?: number // milliseconds (default: 2 seconds)
      onProgress?: (status: BatchStatus) => void
    } = {}
  ): Promise<BatchStatus> {
    const timeout = options.timeout || 300000 // 5 minutes
    const interval = options.interval || 2000 // 2 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const status = await this.getBatchStatus(batchJobId)

      if (options.onProgress) {
        options.onProgress(status)
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error(`Batch processing timeout after ${timeout}ms`)
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface BatchStatus {
  batchJobId: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalDocuments: number
  completedDocuments: number
  successfulRuns: number
  failedRuns: number
  currentDocument: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface BatchAnalytics {
  globalSummary: {
    totalDocuments: number
    totalRuns: number
    successRate: number
    totalCost: number
    avgExecutionTime: number
  }
  modelAnalytics: Array<{
    model: string
    successCount: number
    failureCount: number
    successRate: number
    avgExecutionTime: number
    totalCost: number
    commonErrors: Array<{
      error: string
      count: number
      documents: string[]
    }>
  }>
  documentResults: Array<{
    documentId: string
    filename: string
    modelsPassedCount: number
    modelsTotalCount: number
    status: 'all_passed' | 'partial' | 'all_failed'
  }>
  attributeFailures: Array<{
    attributePath: string
    missingCount: number
    typeMismatchCount: number
    formatViolationCount: number
    affectedModels: string[]
    pattern: string
  }>
}
