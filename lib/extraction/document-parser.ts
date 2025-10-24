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
 * Extract text from a PDF file using pdfjs-dist (Mozilla's PDF.js)
 */
export async function extractPDF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Import pdfjs-dist dynamically to avoid webpack issues
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    })

    const pdf = await loadingTask.promise
    let fullText = ''

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Combine text items with spaces
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')

      fullText += pageText + '\n\n'
    }

    const text = fullText.trim()

    if (text.length < 10) {
      throw new Error('PDF appears to be empty or contains only images')
    }

    return {
      text,
      charCount: text.length,
      excerpt: text.substring(0, 200)
    }
  } catch (error) {
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
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
