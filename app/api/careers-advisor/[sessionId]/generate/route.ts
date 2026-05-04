import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCareersAdvisor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { generateCareersReport } from '@/lib/careers-advisor-ai'
import { isAiUnavailable } from '@/lib/ai-runner'
import type { AdvisorAnswers } from '@/types'

// Simple in-memory rate limiter: 10 requests per 5 minutes per user
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW = 5 * 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return true
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = session!.user.id

  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes before generating another report.' },
      { status: 429 }
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
