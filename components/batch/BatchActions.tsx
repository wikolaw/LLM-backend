'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2 } from 'lucide-react'

interface BatchActionsProps {
  batchId: string
  batchName: string
  status: string
}

export default function BatchActions({
  batchId,
  batchName,
  status,
}: BatchActionsProps) {
  const router = useRouter()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCloneAndEdit = () => {
    router.push(`/dashboard?cloneFrom=${batchId}`)
  }

  const handleDelete = async () => {
    if (status === 'processing') {
      alert('Cannot delete a batch that is currently processing')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete batch')
      }

      // Force a full page reload to ensure fresh data
      window.location.href = '/batches'
    } catch (error) {
      console.error('Delete error:', error)
      alert(
        error instanceof Error ? error.message : 'Failed to delete batch'
      )
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={handleCloneAndEdit}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Edit className="w-4 h-4" />
          Clone & Edit
        </button>
        <button
          onClick={() => setDeleteConfirm(true)}
          disabled={status === 'processing'}
          className="flex items-center gap-2 px-4 py-2 bg-error-600 dark:bg-error-500 text-white rounded-lg hover:bg-error-700 dark:hover:bg-error-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-sm"
          title={
            status === 'processing'
              ? 'Cannot delete while processing'
              : 'Delete this batch'
          }
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Batch?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to delete <strong>{batchName}</strong>?
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete all associated runs and analytics.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-error-600 dark:bg-error-500 rounded-md hover:bg-error-700 dark:hover:bg-error-600 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
