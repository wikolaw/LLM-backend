'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Eye, AlertCircle } from 'lucide-react'

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

interface BatchHistoryTableProps {
  batches: Batch[]
  onDelete: (batchId: string) => void
}

export default function BatchHistoryTable({
  batches,
  onDelete,
}: BatchHistoryTableProps) {
  const router = useRouter()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No batches yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Create your first batch to start processing documents with multiple LLM
          models.
        </p>
      </div>
    )
  }

  const handleDelete = (batchId: string) => {
    setDeleteConfirm(batchId)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-100`
      case 'processing':
        return `${baseClasses} bg-primary-100 dark:bg-primary-950/30 text-primary-800 dark:text-primary-100`
      case 'failed':
        return `${baseClasses} bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100`
      case 'pending':
        return `${baseClasses} bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200`
      default:
        return `${baseClasses} bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200`
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-success-600 dark:text-success-500'
    if (rate >= 50) return 'text-warning-600 dark:text-warning-500'
    return 'text-error-600 dark:text-error-500'
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Batch Name
              </th>
              <th className="w-[28%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Models
              </th>
              <th className="hidden lg:table-cell w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Docs
              </th>
              <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Success
              </th>
              <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="hidden lg:table-cell w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Updated
              </th>
              <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {batches.map((batch) => (
              <tr
                key={batch.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/batches/${batch.id}`)}
              >
                <td className="px-4 py-4">
                  <div
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
                    title={batch.name || 'Untitled Batch'}
                  >
                    {batch.name || 'Untitled Batch'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {batch.modelsUsed.slice(0, 3).map((model, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        title={model}
                      >
                        {model}
                      </span>
                    ))}
                    {batch.modelsUsed.length > 3 && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        title={`Additional models: ${batch.modelsUsed.slice(3).join(', ')}`}
                      >
                        +{batch.modelsUsed.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {batch.totalDocuments}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div
                    className={`text-sm font-semibold ${getSuccessRateColor(
                      batch.successRate
                    )}`}
                  >
                    {batch.successRate}%
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(batch.status)}>
                    {batch.status}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(batch.updatedAt || batch.createdAt)}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/batches/${batch.id}`)
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 flex items-center gap-1 transition-colors"
                      title="View batch"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(batch.id)
                      }}
                      className="text-error-600 dark:text-error-500 hover:text-error-800 dark:hover:text-error-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Delete batch"
                      disabled={batch.status === 'processing'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Batch?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this batch? This will permanently
              delete all associated runs and analytics. This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-error-600 dark:bg-error-500 rounded-md hover:bg-error-700 dark:hover:bg-error-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
