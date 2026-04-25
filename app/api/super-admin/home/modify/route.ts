import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { runPrompt, AI_FEATURE_UNAVAILABLE } from '@/lib/ai-runner'
import { sanitizeHtml } from '@/lib/sanitize'
import { prisma } from '@/lib/prisma'

const PROMPT_KEY = 'home.modify'
const PROMPT_MISSING_ERROR =
  'The "home.modify" prompt is not configured yet. A charity admin needs to seed it (run prisma/seed-home-prompt.ts) or create it manually under Super Admin → AI Prompts.'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please wait a few minutes before trying again.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const instruction: string = typeof body?.instruction === 'string' ? body.instruction.trim() : ''
  const currentHtml: string = typeof body?.currentHtml === 'string' ? body.currentHtml : ''

  if (!instruction) {
    return NextResponse.json({ error: 'Please describe the change you want.' }, { status: 400 })
  }
  if (!currentHtml.trim()) {
    return NextResponse.json(
      { error: 'There is no existing layout to modify yet. Generate one first.' },
      { status: 400 },
    )
  }

  // Pre-flight: surface a clear, actionable error when the prompt row is
  // missing or disabled, instead of the generic "AI feature unavailable".
  const promptRow = await prisma.aiPrompt.findUnique({
    where: { key: PROMPT_KEY },
    select: { enabled: true },
  })
  if (!promptRow) {
    return NextResponse.json({ error: PROMPT_MISSING_ERROR }, { status: 503 })
  }
  if (!promptRow.enabled) {
    return NextResponse.json(
      { error: 'The "home.modify" prompt is disabled. Enable it under Super Admin → AI Prompts.' },
      { status: 503 },
    )
  }

  const raw = await runPrompt(PROMPT_KEY, { instruction, currentHtml })
  if (raw === AI_FEATURE_UNAVAILABLE) {
    return NextResponse.json({ error: AI_FEATURE_UNAVAILABLE }, { status: 503 })
  }

  const html = sanitizeHtml(stripCodeFences(raw))
  return NextResponse.json({ html })
}
