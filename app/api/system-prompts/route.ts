import { NextRequest, NextResponse } from "next/server"
import { loadSystemPrompts } from '@/lib/prompt-loader'

export async function GET() {
  try {
    const systemPrompts = await loadSystemPrompts()
    return NextResponse.json(systemPrompts)
  } catch (error) {
    console.error("Error loading system prompts:", error)
    return NextResponse.json(
      { error: "Failed to load system prompts" },
      { status: 500 }
    )
  }
}
