import { NextRequest, NextResponse } from 'next/server'
import { generateJSONSchema } from '@/lib/ai/schema-generator'
import type { OutputFormat } from '@/lib/schemas/extraction'

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, optimizedPrompt, outputFormat } = await request.json()

    if (!userPrompt || !userPrompt.trim()) {
      return NextResponse.json(
        { error: 'userPrompt is required' },
        { status: 400 }
      )
    }

    if (!optimizedPrompt || !optimizedPrompt.trim()) {
      return NextResponse.json(
        { error: 'optimizedPrompt is required' },
        { status: 400 }
      )
    }

    if (!outputFormat || !['json', 'jsonl'].includes(outputFormat)) {
      return NextResponse.json(
        { error: 'outputFormat must be "json" or "jsonl"' },
        { status: 400 }
      )
    }

    const schema = await generateJSONSchema(userPrompt, optimizedPrompt, outputFormat as OutputFormat)

    return NextResponse.json({ schema })
  } catch (error) {
    console.error('Error generating schema:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate schema' },
      { status: 500 }
    )
  }
}
