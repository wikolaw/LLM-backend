'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BatchHistoryTable from './BatchHistoryTable'

interface Batch {
  id: string
  name: string
  modelsUsed: string[]
  totalDocuments: number
  completedDocuments: number
  successfulRuns: number
  failedRuns: number
  successRate: number
  status: string
  createdAt: string
  updatedAt: string
}

interface BatchHistoryClientProps {
  initialBatches: Batch[]
}

export default function BatchHistoryClient({ initialBatches }: BatchHistoryClientProps) {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>(initialBatches)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync state when initialBatches prop changes (after page reload)
  useEffect(() => {
    setBatches(initialBatches)
  }, [initialBatches])

  const handleDelete = async (batchId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete batch')
      }

      // Remove from local state
      setBatches(batches.filter(b => b.id !== batchId))
    } catch (err: any) {
      console.error('Error deleting batch:', err)
      alert(`Failed to delete batch: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Batches</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and view results from your document processing batches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                ← Home
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors font-semibold shadow-sm"
              >
                Create New Batch
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-900 dark:text-primary-100">Batch History</p>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                  View all your previous batch jobs, check their status, and access detailed analytics. Click any batch to view its results or use the "Clone" action to create a new batch with the same configuration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Batch History Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <BatchHistoryTable
            batches={batches}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </main>
  )
}
