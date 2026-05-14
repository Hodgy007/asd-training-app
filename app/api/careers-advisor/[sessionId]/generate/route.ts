import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCareersAdvisor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { generateCareersReport } from '@/lib/careers-advisor-ai'
import { isAiUnavailable } from '@/lib/ai-runner'
import { createRateLimiter } from '@/lib/rate-limit'
import type { AdvisorAnswers } from '@/types'

// 10 reports per 5 minutes per user. Backed by Upstash when configured —
// the previous Map<> was per-Lambda only.
const generateLimiter = createRateLimiter('careers-advisor-generate', 5 * 60 * 1000, 10)
// 10 full reports per 24 hours per user. Each generation is a single
// expensive call (full structured report) — the daily cap is tighter than
// CV AI because the per-call cost is meaningfully higher.
const generateDailyLimiter = createRateLimiter('careers-advisor-generate-daily', 24 * 60 * 60 * 1000, 10)

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = session!.user.id

  // Daily ceiling first so the user gets the more meaningful error message
  // when they've genuinely exhausted their quota for today.
  const daily = await generateDailyLimiter.check(userId)
  if (!daily.success) {
    return NextResponse.json(
      {
        error: 'You have reached today’s AI usage limit. Please try again tomorrow.',
        code: 'DAILY_LIMIT',
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.retryAfterMs / 1000)) } }
    )
  }
  const rate = await generateLimiter.check(userId)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes before generating another report.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    )
  }

  const advisorSession = await prisma.careerAdvisorSession.findUnique({
    where: { id: params.sessionId },
  })

  if (!advisorSession || advisorSession.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const answers = advisorSession.answers as AdvisorAnswers | null
  if (!answers || !answers.interests?.length) {
    return NextResponse.json(
      { error: 'Please complete the questionnaire before generating a report.' },
      { status: 400 }
    )
  }

  try {
    const report = await generateCareersReport(answers)

    const updated = await prisma.careerAdvisorSession.update({
      where: { id: params.sessionId },
      data: {
        report: JSON.parse(JSON.stringify(report)),
        status: 'COMPLETE',
      },
    })

    return NextResponse.json({ report: updated.report })
  } catch (error) {
    if (isAiUnavailable(error)) {
      return NextResponse.json(
        { error: 'AI is temporarily unavailable. Please try again in a moment.', code: 'AI_UNAVAILABLE' },
        { status: 503 }
      )
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Failed to generate careers report:', msg)
    return NextResponse.json(
      { error: msg || 'Failed to generate report. Please try again.' },
      { status: 500 }
    )
  }
}
