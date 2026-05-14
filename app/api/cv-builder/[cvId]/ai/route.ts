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
import { createRateLimiter } from '@/lib/rate-limit'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

// 10 AI requests per 5 minutes per user. Backed by Upstash when configured
// so the cap holds across Vercel instances; the previous in-memory Map<>
// was per-Lambda only, giving an effective limit of 10 × instance count.
const aiLimiter = createRateLimiter('cv-ai', 5 * 60 * 1000, 10)
// 50 AI requests per 24 hours per user. Hard daily ceiling so a stuck
// client (or an abusive one that waits out the 5-min window) can't run
// up the AI Gateway bill indefinitely.
const aiDailyLimiter = createRateLimiter('cv-ai-daily', 24 * 60 * 60 * 1000, 50)

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit check — daily ceiling first so the more meaningful error
  // ("come back tomorrow") wins over the short-window "wait a few minutes".
  const daily = await aiDailyLimiter.check(session.user.id)
  if (!daily.success) {
    return NextResponse.json(
      {
        error: 'You have reached today’s AI usage limit. Please try again tomorrow.',
        code: 'DAILY_LIMIT',
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.retryAfterMs / 1000)) } }
    )
  }
  const rate = await aiLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please wait a few minutes before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
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
