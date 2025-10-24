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
    } else if (mimeType === 'application/pdf' ||
               mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               mimeType === 'application/msword') {
      // For PDF/DOCX: Temporary limitation - recommend converting to TXT
      // TODO: Integrate with pdf.co or similar API for production
      throw new Error(
        `PDF and DOCX extraction is not yet implemented in the serverless environment. ` +
        `Please convert your ${mimeType.includes('pdf') ? 'PDF' : 'DOCX'} file to TXT format first. ` +
        `You can use: https://convertio.co/pdf-txt/ or https://convertio.co/docx-txt/`
      )
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Currently only TXT files are supported.`)
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
