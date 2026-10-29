import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { generateOutline, withRetry } from '@/lib/content-generator'
import type { ParsedFile, GenerationMode, GenerationLens } from '@/lib/content-generator-types'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({ error: 'AI_GATEWAY_API_KEY is not configured' }, { status: 500 })
  }

  let body: {
    parsedContent?: ParsedFile[]
    mode?: GenerationMode
    lens?: GenerationLens
    programName?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { parsedContent, mode, lens, programName } = body

  if (!parsedContent || !Array.isArray(parsedContent) || parsedContent.length === 0) {
    return NextResponse.json({ error: 'parsedContent is required and must be a non-empty array' }, { status: 400 })
  }
  if (!mode || (mode !== 'structure' && mode !== 'generate')) {
    return NextResponse.json({ error: 'mode is required and must be "structure" or "generate"' }, { status: 400 })
  }
  if (!programName || typeof programName !== 'string' || !programName.trim()) {
    return NextResponse.json({ error: 'programName is required' }, { status: 400 })
  }

  try {
    const outline = await withRetry(() => generateOutline(parsedContent, mode, programName.trim()))
    return NextResponse.json(outline)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate outline'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
