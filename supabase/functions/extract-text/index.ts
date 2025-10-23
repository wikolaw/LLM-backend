import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ExtractRequest {
  documentId: string
  storagePath: string
  mimeType: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { documentId, storagePath, mimeType }: ExtractRequest = await req.json()

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('documents')
      .download(storagePath)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    let extractedText = ''

    // Extract text based on mime type
    if (mimeType === 'text/plain') {
      // Plain text - simple read
      extractedText = await fileData.text()
    } else if (mimeType === 'application/pdf') {
      // For PDF, we'll use a simple approach - convert to text
      // In production, you might want to use an external API like PDF.co or PyPDF2 service
      const arrayBuffer = await fileData.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Very basic text extraction from PDF (this won't work well for all PDFs)
      // For a production system, consider using an external service
      const decoder = new TextDecoder('utf-8')
      const rawText = decoder.decode(bytes)

      // Extract printable text (this is a very naive approach)
      extractedText = rawText
        .replace(/[^\x20-\x7E\n\r\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000) // Limit to 50k chars

      // Note: For production, implement proper PDF parsing or use external service
      if (extractedText.length < 100) {
        throw new Error('PDF text extraction produced minimal output. Consider using an external PDF service.')
      }
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      // For DOCX/DOC, we need external library or service
      // For now, return error suggesting to use TXT or implement external service
      throw new Error('DOCX/DOC extraction requires external service. Please convert to PDF or TXT first.')
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }

    // Update document with extracted text
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({
        full_text: extractedText,
        text_excerpt: extractedText.substring(0, 500),
        char_count: extractedText.length,
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        charCount: extractedText.length,
        excerpt: extractedText.substring(0, 200),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
