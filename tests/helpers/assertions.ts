/**
 * Custom Assertions for API Tests
 * Helper functions to validate API responses and batch analytics
 */

import { expect } from '@playwright/test'
import { BatchAnalytics, BatchStatus } from './api-client'
import { OPTIMIZATION_EXPECTATIONS } from './test-data'

/**
 * Assert that a prompt has been properly optimized
 */
export function assertOptimizedPrompt(optimizedPrompt: string) {
  // Check length (400-800 words)
  const wordCount = optimizedPrompt.split(/\s+/).length
  expect(wordCount).toBeGreaterThanOrEqual(OPTIMIZATION_EXPECTATIONS.minWords)
  expect(wordCount).toBeLessThanOrEqual(OPTIMIZATION_EXPECTATIONS.maxWords)

  // Check for required sections
  for (const section of OPTIMIZATION_EXPECTATIONS.requiredSections) {
    expect(optimizedPrompt).toContain(section)
  }

  // Check for format standards
  for (const standard of OPTIMIZATION_EXPECTATIONS.requiredFormatStandards) {
    expect(optimizedPrompt).toContain(standard)
  }
}

/**
 * Assert that a JSON Schema is valid (draft-07)
 */
export function assertValidJSONSchema(schema: any) {
  expect(schema).toHaveProperty('type', 'object')
  expect(schema).toHaveProperty('properties')
  expect(typeof schema.properties).toBe('object')

  // Optional but common properties
  if (schema.required) {
    expect(Array.isArray(schema.required)).toBe(true)
  }
}

/**
 * Assert that batch status has expected structure
 */
export function assertBatchStatus(status: BatchStatus) {
  expect(status).toHaveProperty('batchJobId')
  expect(status).toHaveProperty('name')
  expect(status).toHaveProperty('status')
  expect(['pending', 'processing', 'completed', 'failed']).toContain(status.status)
  expect(status).toHaveProperty('totalDocuments')
  expect(status).toHaveProperty('completedDocuments')
  expect(status).toHaveProperty('successfulRuns')
  expect(status).toHaveProperty('failedRuns')
}

/**
 * Assert that batch analytics has expected structure
 */
export function assertBatchAnalytics(analytics: BatchAnalytics, expectedDocs: number, expectedModels: number) {
  // Global summary
  expect(analytics.globalSummary).toHaveProperty('totalDocuments', expectedDocs)
  expect(analytics.globalSummary).toHaveProperty('totalRuns', expectedDocs * expectedModels)
  expect(analytics.globalSummary).toHaveProperty('successRate')
  expect(analytics.globalSummary.successRate).toBeGreaterThanOrEqual(0)
  expect(analytics.globalSummary.successRate).toBeLessThanOrEqual(1)
  expect(analytics.globalSummary).toHaveProperty('totalCost')
  expect(analytics.globalSummary).toHaveProperty('avgExecutionTime')

  // Model analytics
  expect(analytics.modelAnalytics).toHaveLength(expectedModels)
  for (const modelAnalytic of analytics.modelAnalytics) {
    expect(modelAnalytic).toHaveProperty('model')
    expect(modelAnalytic).toHaveProperty('successCount')
    expect(modelAnalytic).toHaveProperty('failureCount')
    expect(modelAnalytic).toHaveProperty('successRate')
    expect(modelAnalytic).toHaveProperty('avgExecutionTime')
    expect(modelAnalytic).toHaveProperty('totalCost')
    expect(modelAnalytic).toHaveProperty('commonErrors')
    expect(Array.isArray(modelAnalytic.commonErrors)).toBe(true)
  }

  // Document results
  expect(analytics.documentResults).toHaveLength(expectedDocs)
  for (const docResult of analytics.documentResults) {
    expect(docResult).toHaveProperty('documentId')
    expect(docResult).toHaveProperty('filename')
    expect(docResult).toHaveProperty('modelsPassedCount')
    expect(docResult).toHaveProperty('modelsTotalCount', expectedModels)
    expect(docResult).toHaveProperty('status')
    expect(['all_passed', 'partial', 'all_failed']).toContain(docResult.status)
  }

  // Attribute failures
  expect(Array.isArray(analytics.attributeFailures)).toBe(true)
  for (const attrFailure of analytics.attributeFailures) {
    expect(attrFailure).toHaveProperty('attributePath')
    expect(attrFailure).toHaveProperty('missingCount')
    expect(attrFailure).toHaveProperty('typeMismatchCount')
    expect(attrFailure).toHaveProperty('formatViolationCount')
    expect(attrFailure).toHaveProperty('affectedModels')
    expect(Array.isArray(attrFailure.affectedModels)).toBe(true)
    expect(attrFailure).toHaveProperty('pattern')
  }
}

/**
 * Assert that batch completed successfully
 */
export function assertBatchCompleted(status: BatchStatus, expectedDocs: number) {
  expect(status.status).toBe('completed')
  expect(status.completedDocuments).toBe(expectedDocs)
  expect(status.errorMessage).toBeNull()
}

/**
 * Assert that at least one model succeeded
 */
export function assertSomeModelsSucceeded(analytics: BatchAnalytics) {
  const totalSuccessful = analytics.modelAnalytics.reduce(
    (sum, model) => sum + model.successCount,
    0
  )
  expect(totalSuccessful).toBeGreaterThan(0)
}

/**
 * Assert cost is within expected range
 */
export function assertCostReasonable(cost: number, maxCost: number = 1.0) {
  expect(cost).toBeGreaterThanOrEqual(0)
  expect(cost).toBeLessThan(maxCost)
}

/**
 * Assert execution time is reasonable
 */
export function assertExecutionTimeReasonable(timeMs: number, maxTimeMs: number = 10000) {
  expect(timeMs).toBeGreaterThan(0)
  expect(timeMs).toBeLessThan(maxTimeMs)
}

/**
 * Print batch analytics summary for debugging
 */
export function printBatchSummary(analytics: BatchAnalytics) {
  console.log('\n📊 Batch Analytics Summary:')
  console.log(`  Total Documents: ${analytics.globalSummary.totalDocuments}`)
  console.log(`  Total Runs: ${analytics.globalSummary.totalRuns}`)
  console.log(`  Success Rate: ${(analytics.globalSummary.successRate * 100).toFixed(1)}%`)
  console.log(`  Total Cost: $${analytics.globalSummary.totalCost.toFixed(4)}`)
  console.log(`  Avg Time: ${analytics.globalSummary.avgExecutionTime}ms`)

  console.log('\n  Models:')
  for (const model of analytics.modelAnalytics) {
    console.log(`    - ${model.model}: ${model.successCount}/${model.successCount + model.failureCount} passed (${(model.successRate * 100).toFixed(1)}%)`)
  }

  if (analytics.attributeFailures.length > 0) {
    console.log('\n  Top Attribute Failures:')
    for (const failure of analytics.attributeFailures.slice(0, 5)) {
      const total = failure.missingCount + failure.typeMismatchCount + failure.formatViolationCount
      console.log(`    - ${failure.attributePath}: ${total} failures (${failure.missingCount}M, ${failure.typeMismatchCount}T, ${failure.formatViolationCount}F)`)
    }
  }
  console.log('')
}
