import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { runPrompt, AI_FEATURE_UNAVAILABLE } from '@/lib/ai-runner'
import { sanitizeHtml } from '@/lib/sanitize'

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
  const brief: string = typeof body?.brief === 'string' ? body.brief.trim() : ''
  if (!brief) {
    return NextResponse.json({ error: 'A brief is required.' }, { status: 400 })
  }

  const raw = await runPrompt('home.generate', { brief })
  if (raw === AI_FEATURE_UNAVAILABLE) {
    return NextResponse.json({ error: AI_FEATURE_UNAVAILABLE }, { status: 503 })
  }

  const html = sanitizeHtml(stripCodeFences(raw))
  return NextResponse.json({ html })
}
