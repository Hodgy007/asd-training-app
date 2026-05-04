import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generatePersonalStatement,
  rephraseBulletPoint,
  suggestSkills,
  improveDescription,
  expandInterests,
} from '@/lib/cv-ai'
import { isAiUnavailable } from '@/lib/ai-runner'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

// ─── Simple in-memory rate limiter ────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// Clean up stale entries periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000)

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit check
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please wait a few minutes before trying again.' },
      { status: 429 }
    )
  }

  // CV ownership check
  const cv = await prisma.cV.findFirst({
    where: { id: params.cvId, userId: session.user.id },
    include: {
      workExperiences: { orderBy: { order: 'asc' } },
      educationEntries: { orderBy: { order: 'asc' } },
      skills: { orderBy: { order: 'asc' } },
    },
  })

  if (!cv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { type, context } = body

    if (!type || !['statement', 'rephrase', 'skills', 'improve', 'interests'].includes(type)) {
      return NextResponse.json({ error: 'Invalid AI action type' }, { status: 400 })
    }

    let result: string | Array<{ name: string; category: string }>

    switch (type) {
      case 'statement': {
        const experienceSummary = cv.workExperiences
          .map((w) => `${w.jobTitle} at ${w.employer}`)
          .join('; ')
        const educationSummary = cv.educationEntries
          .map((e) => `${e.qualification} at ${e.institution}`)
          .join('; ')

        result = await generatePersonalStatement({
          name: cv.fullName || 'the applicant',
          targetRole: context?.targetRole,
          experience: experienceSummary || context?.experience || '',
          education: educationSummary || context?.education || '',
        })
        break
      }

      case 'rephrase': {
        if (!context?.text || !context?.jobTitle || !context?.employer) {
          return NextResponse.json(
            { error: 'Missing required fields: text, jobTitle, employer' },
            { status: 400 }
          )
        }
        result = await rephraseBulletPoint(context.text, context.jobTitle, context.employer)
        break
      }

      case 'skills': {
        const experienceSummary = cv.workExperiences
          .map((w) => `${w.jobTitle} at ${w.employer}: ${w.description || ''}`)
          .join('; ')
        const educationSummary = cv.educationEntries
          .map((e) => `${e.qualification} at ${e.institution}`)
          .join('; ')

        result = await suggestSkills({
          experience: experienceSummary || context?.experience || '',
          education: educationSummary || context?.education || '',
        })
        break
      }

      case 'improve': {
        if (!context?.description || !context?.jobTitle || !context?.employer) {
          return NextResponse.json(
            { error: 'Missing required fields: description, jobTitle, employer' },
            { status: 400 }
          )
        }
        result = await improveDescription(context.description, context.jobTitle, context.employer)
        break
      }

      case 'interests': {
        result = await expandInterests(context?.text ?? '')
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid AI action type' }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    // AI unavailable → 503 with a clear code so the UI can show a banner
    // (or, in the current implementation, silently no-op). Crucially, do
    // NOT return the literal sentinel string as `result` — that would land
    // verbatim inside the user's saved CV.
    if (isAiUnavailable(error)) {
      return NextResponse.json(
        { error: 'AI is temporarily unavailable. Please try again in a moment.', code: 'AI_UNAVAILABLE' },
        { status: 503 },
      )
    }
    console.error('POST /api/cv-builder/[cvId]/ai error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
