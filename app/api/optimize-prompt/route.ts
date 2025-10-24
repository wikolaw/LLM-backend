import { NextRequest, NextResponse } from 'next/server'
import { optimizePrompt } from '@/lib/ai/prompt-optimizer'
import type { OutputFormat } from '@/lib/schemas/extraction'

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, outputFormat } = await request.json()

    if (!userPrompt || !userPrompt.trim()) {
      return NextResponse.json(
        { error: 'userPrompt is required' },
        { status: 400 }
      )
    }

    if (!outputFormat || !['json', 'jsonl'].includes(outputFormat)) {
      return NextResponse.json(
        { error: 'outputFormat must be "json" or "jsonl"' },
        { status: 400 }
      )
    }

    const optimizedPrompt = await optimizePrompt(userPrompt, outputFormat as OutputFormat)

    return NextResponse.json({ optimizedPrompt })
  } catch (error) {
    console.error('Error optimizing prompt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize prompt' },
      { status: 500 }
    )
  }
}
