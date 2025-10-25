/**
 * Unit Tests for Analytics Generator
 * Tests individual functions with fixture data (no external dependencies)
 */

import { test, expect } from '@playwright/test'
import {
  categorizeError,
  analyzeAttributeFailures,
  calculateModelAnalytics,
  detectPatterns,
  type ValidationError,
  type Output,
  type Run,
  type Document
} from '../../supabase/functions/_shared/analytics-generator'

test.describe('Analytics Generator - Unit Tests', () => {

  // ============================================================================
  // categorizeError() Tests
  // ============================================================================

  test.describe('categorizeError()', () => {
    test('should categorize required field error as missing', () => {
      const error: ValidationError = {
        instancePath: '/contract_name',
        message: 'is required',
        keyword: 'required'
      }

      const result = categorizeError(error)

      expect(result.attributePath).toBe('contract_name')
      expect(result.errorType).toBe('missing')
    })

    test('should categorize type error as type_mismatch', () => {
      const error: ValidationError = {
        instancePath: '/total_amount',
        message: 'must be number',
        keyword: 'type'
      }

      const result = categorizeError(error)

      expect(result.attributePath).toBe('total_amount')
      expect(result.errorType).toBe('type_mismatch')
    })

    test('should categorize format error as format_violation', () => {
      const error: ValidationError = {
        instancePath: '/start_date',
        message: 'must match format "date"',
        keyword: 'format'
      }

      const result = categorizeError(error)

      expect(result.attributePath).toBe('start_date')
      expect(result.errorType).toBe('format_violation')
    })

    test('should handle nested paths correctly', () => {
      const error: ValidationError = {
        instancePath: '/parties/supplier_name',
        message: 'is required',
        keyword: 'required'
      }

      const result = categorizeError(error)

      expect(result.attributePath).toBe('parties.supplier_name')
      expect(result.errorType).toBe('missing')
    })

    test('should remove leading slash from path', () => {
      const error: ValidationError = {
        instancePath: '/field',
        message: 'is required',
        keyword: 'required'
      }

      const result = categorizeError(error)

      expect(result.attributePath).toBe('field')
    })
  })

  // ============================================================================
  // analyzeAttributeFailures() Tests
  // ============================================================================

  test.describe('analyzeAttributeFailures()', () => {
    test('should aggregate failures across multiple outputs', () => {
      const documents: Document[] = [
        { id: 'doc1', filename: 'test1.pdf' },
        { id: 'doc2', filename: 'test2.pdf' }
      ]

      const runs: Run[] = [
        { id: 'run1', document_id: 'doc1' },
        { id: 'run2', document_id: 'doc2' }
      ]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: false,
          validation_errors: [
            { instancePath: '/contract_name', message: 'is required', keyword: 'required' }
          ],
          execution_time_ms: 1000,
          cost_in: 0.001,
          cost_out: 0.002,
          tokens_in: 100,
          tokens_out: 50
        },
        {
          id: 'out2',
          run_id: 'run2',
          model: 'claude',
          validation_passed: false,
          validation_errors: [
            { instancePath: '/contract_name', message: 'is required', keyword: 'required' }
          ],
          execution_time_ms: 1200,
          cost_in: 0.002,
          cost_out: 0.003,
          tokens_in: 120,
          tokens_out: 60
        }
      ]

      const failures = analyzeAttributeFailures(outputs, runs, documents)

      expect(failures).toHaveLength(1)
      expect(failures[0].attributePath).toBe('contract_name')
      expect(failures[0].missingCount).toBe(2)
      expect(failures[0].typeMismatchCount).toBe(0)
      expect(failures[0].formatViolationCount).toBe(0)
      expect(failures[0].totalFailures).toBe(2)
      expect(failures[0].affectedModels).toEqual(['gpt-4', 'claude'])
      expect(failures[0].affectedDocuments).toEqual(['test1.pdf', 'test2.pdf'])
    })

    test('should track different error types for same attribute', () => {
      const documents: Document[] = [{ id: 'doc1', filename: 'test.pdf' }]
      const runs: Run[] = [{ id: 'run1', document_id: 'doc1' }]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: false,
          validation_errors: [
            { instancePath: '/amount', message: 'is required', keyword: 'required' },
            { instancePath: '/amount', message: 'must be number', keyword: 'type' }
          ],
          execution_time_ms: 1000,
          cost_in: 0.001,
          cost_out: 0.002,
          tokens_in: 100,
          tokens_out: 50
        }
      ]

      const failures = analyzeAttributeFailures(outputs, runs, documents)

      expect(failures).toHaveLength(1)
      expect(failures[0].attributePath).toBe('amount')
      expect(failures[0].missingCount).toBe(1)
      expect(failures[0].typeMismatchCount).toBe(1)
      expect(failures[0].totalFailures).toBe(2)
    })

    test('should sort failures by total count descending', () => {
      const documents: Document[] = [{ id: 'doc1', filename: 'test.pdf' }]
      const runs: Run[] = [{ id: 'run1', document_id: 'doc1' }]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: false,
          validation_errors: [
            { instancePath: '/field1', message: 'is required' }, // 1 failure
            { instancePath: '/field2', message: 'is required' }, // 3 failures total
            { instancePath: '/field2', message: 'must be string' },
            { instancePath: '/field2', message: 'wrong format' }
          ],
          execution_time_ms: 1000,
          cost_in: 0.001,
          cost_out: 0.002,
          tokens_in: 100,
          tokens_out: 50
        }
      ]

      const failures = analyzeAttributeFailures(outputs, runs, documents)

      expect(failures).toHaveLength(2)
      expect(failures[0].attributePath).toBe('field2') // More failures, sorted first
      expect(failures[0].totalFailures).toBe(3)
      expect(failures[1].attributePath).toBe('field1')
      expect(failures[1].totalFailures).toBe(1)
    })
  })

  // ============================================================================
  // calculateModelAnalytics() Tests
  // ============================================================================

  test.describe('calculateModelAnalytics()', () => {
    test('should calculate success/failure counts correctly', () => {
      const documents: Document[] = [{ id: 'doc1', filename: 'test.pdf' }]
      const runs: Run[] = [{ id: 'run1', document_id: 'doc1' }]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: true,
          validation_errors: null,
          execution_time_ms: 1000,
          cost_in: 0.001,
          cost_out: 0.002,
          tokens_in: 100,
          tokens_out: 50
        },
        {
          id: 'out2',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: false,
          validation_errors: [{ instancePath: '/field', message: 'error' }],
          execution_time_ms: 1200,
          cost_in: 0.002,
          cost_out: 0.003,
          tokens_in: 120,
          tokens_out: 60
        },
        {
          id: 'out3',
          run_id: 'run1',
          model: 'claude', // Different model, should not affect gpt-4 analytics
          validation_passed: true,
          validation_errors: null,
          execution_time_ms: 900,
          cost_in: 0.001,
          cost_out: 0.001,
          tokens_in: 90,
          tokens_out: 40
        }
      ]

      const analytics = calculateModelAnalytics('gpt-4', outputs, runs, documents)

      expect(analytics.model).toBe('gpt-4')
      expect(analytics.successCount).toBe(1)
      expect(analytics.failureCount).toBe(1)
      expect(analytics.successRate).toBe(0.5)
    })

    test('should calculate average execution time', () => {
      const documents: Document[] = [{ id: 'doc1', filename: 'test.pdf' }]
      const runs: Run[] = [{ id: 'run1', document_id: 'doc1' }]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: true,
          validation_errors: null,
          execution_time_ms: 1000,
          cost_in: 0,
          cost_out: 0,
          tokens_in: 0,
          tokens_out: 0
        },
        {
          id: 'out2',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: true,
          validation_errors: null,
          execution_time_ms: 2000,
          cost_in: 0,
          cost_out: 0,
          tokens_in: 0,
          tokens_out: 0
        }
      ]

      const analytics = calculateModelAnalytics('gpt-4', outputs, runs, documents)

      expect(analytics.avgExecutionTime).toBe(1500) // (1000 + 2000) / 2
    })

    test('should calculate total cost correctly', () => {
      const documents: Document[] = [{ id: 'doc1', filename: 'test.pdf' }]
      const runs: Run[] = [{ id: 'run1', document_id: 'doc1' }]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: true,
          validation_errors: null,
          execution_time_ms: 1000,
          cost_in: 0.001,
          cost_out: 0.002,
          tokens_in: 100,
          tokens_out: 50
        },
        {
          id: 'out2',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: true,
          validation_errors: null,
          execution_time_ms: 1000,
          cost_in: 0.003,
          cost_out: 0.004,
          tokens_in: 150,
          tokens_out: 75
        }
      ]

      const analytics = calculateModelAnalytics('gpt-4', outputs, runs, documents)

      expect(analytics.totalCost).toBe(0.010) // 0.001 + 0.002 + 0.003 + 0.004
    })

    test('should extract common errors', () => {
      const documents: Document[] = [
        { id: 'doc1', filename: 'test1.pdf' },
        { id: 'doc2', filename: 'test2.pdf' }
      ]
      const runs: Run[] = [
        { id: 'run1', document_id: 'doc1' },
        { id: 'run2', document_id: 'doc2' }
      ]

      const outputs: Output[] = [
        {
          id: 'out1',
          run_id: 'run1',
          model: 'gpt-4',
          validation_passed: false,
          validation_errors: [
            { instancePath: '/field', message: 'is required' }
          ],
          execution_time_ms: 1000,
          cost_in: 0,
          cost_out: 0,
          tokens_in: 0,
          tokens_out: 0
        },
        {
          id: 'out2',
          run_id: 'run2',
          model: 'gpt-4',
          validation_passed: false,
          validation_errors: [
            { instancePath: '/field', message: 'is required' },
            { instancePath: '/other', message: 'must be string' }
          ],
          execution_time_ms: 1000,
          cost_in: 0,
          cost_out: 0,
          tokens_in: 0,
          tokens_out: 0
        }
      ]

      const analytics = calculateModelAnalytics('gpt-4', outputs, runs, documents)

      expect(analytics.commonErrors).toHaveLength(2)
      expect(analytics.commonErrors[0].error).toBe('is required')
      expect(analytics.commonErrors[0].count).toBe(2)
      expect(analytics.commonErrors[0].documents).toEqual(['test1.pdf', 'test2.pdf'])
      expect(analytics.commonErrors[1].error).toBe('must be string')
      expect(analytics.commonErrors[1].count).toBe(1)
    })
  })

  // ============================================================================
  // detectPatterns() Tests
  // ============================================================================

  test.describe('detectPatterns()', () => {
    test('should detect universal failures (all models fail)', () => {
      const attributeFailures = [
        {
          attributePath: 'contract_name',
          missingCount: 6,
          typeMismatchCount: 0,
          formatViolationCount: 0,
          totalFailures: 6,
          affectedModels: ['gpt-4', 'claude', 'gemini'],
          affectedDocuments: ['doc1.pdf', 'doc2.pdf']
        }
      ]

      const modelAnalytics = [
        { model: 'gpt-4', successCount: 0, failureCount: 2, successRate: 0, avgExecutionTime: 1000, totalCost: 0.01, commonErrors: [], attributeFailures: {} },
        { model: 'claude', successCount: 0, failureCount: 2, successRate: 0, avgExecutionTime: 1000, totalCost: 0.01, commonErrors: [], attributeFailures: {} },
        { model: 'gemini', successCount: 0, failureCount: 2, successRate: 0, avgExecutionTime: 1000, totalCost: 0.01, commonErrors: [], attributeFailures: {} }
      ]

      const patterns = detectPatterns(attributeFailures, modelAnalytics, 3, 2)

      const universalPattern = patterns.find(p => p.type === 'universal_failure')
      expect(universalPattern).toBeDefined()
      expect(universalPattern?.severity).toBe('high')
      expect(universalPattern?.message).toContain('All 3 models')
      expect(universalPattern?.message).toContain('contract_name')
    })

    test('should detect model-specific weaknesses', () => {
      const attributeFailures = []

      const modelAnalytics = [
        {
          model: 'weak-model',
          successCount: 1,
          failureCount: 9,
          successRate: 0.1,
          avgExecutionTime: 1000,
          totalCost: 0.01,
          commonErrors: [],
          attributeFailures: {
            field1: { missing: 3, type_mismatch: 0, format_violation: 0 },
            field2: { missing: 2, type_mismatch: 0, format_violation: 0 },
            field3: { missing: 2, type_mismatch: 0, format_violation: 0 },
            field4: { missing: 1, type_mismatch: 0, format_violation: 0 },
            field5: { missing: 1, type_mismatch: 0, format_violation: 0 }
          }
        }
      ]

      const patterns = detectPatterns(attributeFailures, modelAnalytics, 1, 10)

      const modelPattern = patterns.find(p => p.type === 'model_specific')
      expect(modelPattern).toBeDefined()
      expect(modelPattern?.severity).toBe('medium')
      expect(modelPattern?.message).toContain('weak-model')
      expect(modelPattern?.message).toContain('5 different attributes')
    })

    test('should detect document-specific issues (attribute missing in most docs)', () => {
      const attributeFailures = [
        {
          attributePath: 'rare_field',
          missingCount: 7,
          typeMismatchCount: 0,
          formatViolationCount: 0,
          totalFailures: 7,
          affectedModels: ['gpt-4', 'claude'],
          affectedDocuments: ['doc1.pdf', 'doc2.pdf', 'doc3.pdf', 'doc4.pdf', 'doc5.pdf', 'doc6.pdf', 'doc7.pdf']
        }
      ]

      const modelAnalytics = []

      const patterns = detectPatterns(attributeFailures, modelAnalytics, 2, 10)

      const docPattern = patterns.find(p => p.type === 'document_specific')
      expect(docPattern).toBeDefined()
      expect(docPattern?.severity).toBe('high')
      expect(docPattern?.message).toContain('rare_field')
      expect(docPattern?.message).toContain('70%')
    })

    test('should detect type issues (more type mismatches than missing)', () => {
      const attributeFailures = [
        {
          attributePath: 'amount',
          missingCount: 1,
          typeMismatchCount: 5,
          formatViolationCount: 0,
          totalFailures: 6,
          affectedModels: ['gpt-4', 'claude'],
          affectedDocuments: ['doc1.pdf', 'doc2.pdf']
        }
      ]

      const modelAnalytics = []

      const patterns = detectPatterns(attributeFailures, modelAnalytics, 2, 2)

      const typePattern = patterns.find(p => p.type === 'type_issue' && p.message.includes('wrong type'))
      expect(typePattern).toBeDefined()
      expect(typePattern?.severity).toBe('medium')
      expect(typePattern?.message).toContain('amount')
      expect(typePattern?.message).toContain('clarify expected data type')
    })

    test('should detect format violations', () => {
      const attributeFailures = [
        {
          attributePath: 'start_date',
          missingCount: 0,
          typeMismatchCount: 0,
          formatViolationCount: 4,
          totalFailures: 4,
          affectedModels: ['gpt-4', 'claude'],
          affectedDocuments: ['doc1.pdf', 'doc2.pdf']
        }
      ]

      const modelAnalytics = []

      const patterns = detectPatterns(attributeFailures, modelAnalytics, 2, 2)

      const formatPattern = patterns.find(p => p.type === 'type_issue' && p.message.includes('format violations'))
      expect(formatPattern).toBeDefined()
      expect(formatPattern?.severity).toBe('low')
      expect(formatPattern?.message).toContain('start_date')
      expect(formatPattern?.message).toContain('specify exact format')
    })

    test('should sort patterns by severity (high > medium > low)', () => {
      const attributeFailures = [
        {
          attributePath: 'field1',
          missingCount: 6,
          typeMismatchCount: 0,
          formatViolationCount: 0,
          totalFailures: 6,
          affectedModels: ['gpt-4', 'claude'],
          affectedDocuments: ['doc1.pdf', 'doc2.pdf', 'doc3.pdf', 'doc4.pdf', 'doc5.pdf', 'doc6.pdf', 'doc7.pdf', 'doc8.pdf', 'doc9.pdf', 'doc10.pdf']
        },
        {
          attributePath: 'field2',
          missingCount: 0,
          typeMismatchCount: 0,
          formatViolationCount: 3,
          totalFailures: 3,
          affectedModels: ['gpt-4'],
          affectedDocuments: ['doc1.pdf']
        }
      ]

      const modelAnalytics = []

      const patterns = detectPatterns(attributeFailures, modelAnalytics, 2, 10)

      // High severity pattern should come first
      if (patterns.length >= 2) {
        const severityOrder = patterns.map(p => p.severity)
        expect(severityOrder[0]).toBe('high')
      }
    })
  })
})
