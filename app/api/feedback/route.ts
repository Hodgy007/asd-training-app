import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { feedbackLimiter } from '@/lib/rate-limit'
import { sendFeedbackEmail, type FeedbackEmailInput } from '@/lib/feedback-email'

const logEntrySchema = z.object({
  level: z.enum(['log', 'info', 'warn', 'error']),
  message: z.string().max(2000),
  ts: z.number(),
  source: z.string().max(500).optional(),
})

const bodySchema = z.object({
  type: z.enum(['BUG', 'SUGGESTION', 'QUESTION', 'OTHER']),
  message: z.string().trim().min(10).max(5000),
  url: z.string().max(500),
  userAgent: z.string().max(500),
  viewport: z.string().regex(/^\d+x\d+$/),
  clientLogs: z.array(logEntrySchema).max(50),
})

function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = await feedbackLimiter.check(`u:${session.user.id}`)
  if (!limit.success) {
    return NextResponse.json(
      { error: 'You have sent feedback recently. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  const submission = await prisma.feedbackSubmission.create({
    data: {
      userId: session.user.id,
      organisationId: session.user.organisationId ?? null,
      type: data.type,
      message: stripControlChars(data.message.trim()),
      url: data.url,
      userAgent: data.userAgent,
      viewport: data.viewport,
      clientLogs: data.clientLogs.map((l) => ({ ...l, message: l.message.slice(0, 2000) })),
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      organisation: { select: { name: true } },
    },
  })

  try {
    await sendFeedbackEmail({
      id: submission.id,
      type: submission.type,
      message: submission.message,
      url: submission.url,
      userAgent: submission.userAgent,
      viewport: submission.viewport,
      clientLogs: data.clientLogs.map((l) => ({ ...l, message: l.message.slice(0, 2000) })) satisfies FeedbackEmailInput['clientLogs'],
      createdAt: submission.createdAt,
      user: submission.user,
      organisation: submission.organisation,
    })
  } catch (err) {
    console.error('sendFeedbackEmail failed', { submissionId: submission.id, err })
  }

  return NextResponse.json({ id: submission.id })
}
