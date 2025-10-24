import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractDocument } from '@/lib/extraction/document-parser'

interface ExtractRequest {
  documentId: string
  storagePath: string
  mimeType: string
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, storagePath, mimeType }: ExtractRequest = await request.json()

    // Validate inputs
    if (!documentId || !storagePath || !mimeType) {
      return NextResponse.json(
        { error: 'documentId, storagePath, and mimeType are required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key (server-side only!)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(storagePath)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Convert Blob to Buffer for extraction libraries
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text based on MIME type
    const { text, charCount, excerpt } = await extractDocument(buffer, mimeType)

    // Update document in database with extracted text
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        full_text: text,
        text_excerpt: excerpt,
        char_count: charCount,
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`)
    }

    // Return success response
    return NextResponse.json({
      success: true,
      charCount,
      excerpt,
    })

  } catch (error) {
    console.error('Extract text error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract text'
      },
      { status: 400 }
    )
  }
}
