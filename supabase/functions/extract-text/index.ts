import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
// @deno-types="npm:@types/mammoth@1.0.5"
import mammoth from 'npm:mammoth@1.8.0'
import * as pdfjsLib from 'npm:pdfjs-dist@4.10.38'

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
      // Extract text from PDF using pdf.js
      try {
        const arrayBuffer = await fileData.arrayBuffer()
        const typedArray = new Uint8Array(arrayBuffer)

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: typedArray })
        const pdfDocument = await loadingTask.promise

        const textParts: string[] = []

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          textParts.push(pageText)
        }

        extractedText = textParts.join('\n').trim()

        if (extractedText.length < 10) {
          throw new Error('PDF appears to be empty or contains only images')
        }
      } catch (pdfError) {
        throw new Error(`PDF extraction failed: ${pdfError.message}`)
      }
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      // Extract text from DOCX using mammoth
      try {
        const arrayBuffer = await fileData.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        extractedText = result.value.trim()

        if (extractedText.length < 10) {
          throw new Error('DOCX appears to be empty')
        }

        // Log any warnings from mammoth
        if (result.messages.length > 0) {
          console.log('Mammoth warnings:', result.messages)
        }
      } catch (docxError) {
        throw new Error(`DOCX extraction failed: ${docxError.message}`)
      }
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
