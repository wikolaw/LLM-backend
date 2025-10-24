import mammoth from 'mammoth'

export interface ExtractionResult {
  text: string
  charCount: number
  excerpt: string
}

/**
 * Extract text from a plain text file
 */
export async function extractText(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString('utf-8').trim()

  if (text.length < 1) {
    throw new Error('Text file appears to be empty')
  }

  return {
    text,
    charCount: text.length,
    excerpt: text.substring(0, 200)
  }
}

/**
 * Extract text from a PDF file
 * NOTE: PDF extraction is currently not implemented due to library compatibility issues.
 * Please convert PDF files to TXT or DOCX format.
 */
export async function extractPDF(buffer: Buffer): Promise<ExtractionResult> {
  throw new Error(
    'PDF extraction is not yet implemented. Please convert your PDF to TXT or DOCX format first. ' +
    'You can use online converters like: https://www.ilovepdf.com/pdf_to_word or https://convertio.co/pdf-txt/'
  )
}

/**
 * Extract text from a DOCX file using mammoth
 */
export async function extractDOCX(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()

    if (text.length < 10) {
      throw new Error('DOCX appears to be empty')
    }

    // Log any warnings from mammoth (optional)
    if (result.messages.length > 0) {
      console.log('Mammoth extraction warnings:', result.messages)
    }

    return {
      text,
      charCount: text.length,
      excerpt: text.substring(0, 200)
    }
  } catch (error) {
    throw new Error(
      `DOCX extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Extract text from a document based on its MIME type
 */
export async function extractDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  switch (mimeType) {
    case 'text/plain':
      return extractText(buffer)

    case 'application/pdf':
      return extractPDF(buffer)

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return extractDOCX(buffer)

    default:
      throw new Error(
        `Unsupported file type: ${mimeType}. Supported types: TXT, PDF, DOCX`
      )
  }
}
