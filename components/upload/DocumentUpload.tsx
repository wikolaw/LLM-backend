'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'

interface UploadedDocument {
  id: string
  filename: string
  charCount: number
  status: 'uploading' | 'extracting' | 'completed' | 'failed'
  error?: string
}

interface DocumentUploadProps {
  onUploadComplete: (documentIds: string[]) => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const supabase = createClient()

  const removeDocument = (docId: string) => {
    setUploadedDocs(docs => docs.filter(d => d.id !== docId))
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsProcessing(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to upload documents')
      }

      // Process all files in parallel
      const uploadPromises = acceptedFiles.map(async (file) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`

        // Add placeholder
        setUploadedDocs(prev => [...prev, {
          id: tempId,
          filename: file.name,
          charCount: 0,
          status: 'uploading'
        }])

        try {
          // Create unique filename
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Create document record
          const { data: document, error: dbError } = await supabase
            .from('documents')
            .insert({
              user_id: user.id,
              filename: file.name,
              mime_type: file.type,
              storage_path: fileName,
            })
            .select()
            .single()

          if (dbError) throw dbError

          // Update status to extracting
          setUploadedDocs(prev => prev.map(doc =>
            doc.id === tempId
              ? { ...doc, id: document.id, status: 'extracting' as const }
              : doc
          ))

          // Call Vercel API to extract text
          const extractResponse = await fetch('/api/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: document.id,
              storagePath: fileName,
              mimeType: file.type,
            })
          })

          if (!extractResponse.ok) {
            const errorData = await extractResponse.json()
            throw new Error(errorData.error || 'Text extraction failed')
          }

          const extractResult = await extractResponse.json()

          if (!extractResult.success) {
            throw new Error(extractResult.error || 'Text extraction failed')
          }

          // Update to completed
          setUploadedDocs(prev => prev.map(doc =>
            doc.id === document.id
              ? { ...doc, charCount: extractResult.charCount, status: 'completed' as const }
              : doc
          ))

          return document.id
        } catch (error) {
          // Update to failed
          setUploadedDocs(prev => prev.map(doc =>
            doc.id === tempId
              ? {
                  ...doc,
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : doc
          ))
          return null
        }
      })

      const results = await Promise.all(uploadPromises)
      const successfulIds = results.filter((id): id is string => id !== null)

      if (successfulIds.length > 0) {
        onUploadComplete(successfulIds)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [supabase, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isProcessing,
  })

  const completedDocs = uploadedDocs.filter(d => d.status === 'completed')
  const hasCompletedDocs = completedDocs.length > 0

  return (
    <div className="w-full space-y-4">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {isDragActive ? (
            <p className="text-lg text-blue-600">Drop files here...</p>
          ) : (
            <>
              <p className="text-lg text-gray-700">
                Drag and drop documents here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Upload multiple files for batch processing
              </p>
              <p className="text-xs text-gray-400">
                Supported: PDF, DOCX, DOC, TXT (max 50MB each)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded documents list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Uploaded Documents ({completedDocs.length}/{uploadedDocs.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border
                  ${doc.status === 'completed' ? 'bg-green-50 border-green-200' : ''}
                  ${doc.status === 'uploading' || doc.status === 'extracting' ? 'bg-blue-50 border-blue-200' : ''}
                  ${doc.status === 'failed' ? 'bg-red-50 border-red-200' : ''}
                `}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.status === 'uploading' && (
                      <span className="text-xs text-blue-600">Uploading...</span>
                    )}
                    {doc.status === 'extracting' && (
                      <span className="text-xs text-blue-600">Extracting text...</span>
                    )}
                    {doc.status === 'completed' && (
                      <span className="text-xs text-green-600">
                        ✓ {doc.charCount.toLocaleString()} characters
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="text-xs text-red-600">
                        ✗ {doc.error || 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === 'completed' && (
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove document"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {(doc.status === 'uploading' || doc.status === 'extracting') && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
