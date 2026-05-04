import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedbackSubmission: { create: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))
vi.mock('@/lib/feedback-email', () => ({
  sendFeedbackEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit')
  return { ...actual, feedbackLimiter: { check: vi.fn(async () => ({ success: true })) } }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { sendFeedbackEmail } from '@/lib/feedback-email'
import { feedbackLimiter } from '@/lib/rate-limit'
import { POST } from '../route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = {
  type: 'BUG',
  message: 'Quiz button is not clickable on iOS',
  url: 'https://example.com/training',
  userAgent: 'Mozilla/5.0',
  viewport: '375x667',
  clientLogs: [],
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.create).mockReset()
    vi.mocked(sendFeedbackEmail).mockClear()
    vi.mocked(feedbackLimiter.check).mockResolvedValue({ success: true })
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate-limited', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    vi.mocked(feedbackLimiter.check).mockResolvedValue({ success: false, retryAfterMs: 60000 })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(429)
  })

  it('returns 400 when validation fails (message too short)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    const res = await POST(makeRequest({ ...validBody, message: 'hi' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when too many client log entries', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ level: 'log', message: String(i), ts: 0 }))
    const res = await POST(makeRequest({ ...validBody, clientLogs: tooMany }))
    expect(res.status).toBe(400)
  })

  it('inserts submission with organisationId from session, not body', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o-real' } } as any)
    vi.mocked(prisma.feedbackSubmission.create).mockResolvedValue({
      id: 'fb_1',
      type: 'BUG',
      message: validBody.message,
      url: validBody.url,
      userAgent: validBody.userAgent,
      viewport: validBody.viewport,
      clientLogs: [],
      createdAt: new Date(),
      user: { name: 'A', email: 'a@x', role: 'CAREGIVER' },
      organisation: null,
    } as any)
    const res = await POST(makeRequest({ ...validBody, organisationId: 'o-spoof' } as any))
    expect(res.status).toBe(200)
    const args = vi.mocked(prisma.feedbackSubmission.create).mock.calls[0][0]
    expect((args.data as any).organisationId).toBe('o-real')
  })

  it('does not 500 when email send fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    vi.mocked(prisma.feedbackSubmission.create).mockResolvedValue({
      id: 'fb_2',
      type: 'BUG', message: validBody.message, url: validBody.url, userAgent: validBody.userAgent,
      viewport: validBody.viewport, clientLogs: [], createdAt: new Date(),
      user: { name: 'A', email: 'a@x', role: 'CAREGIVER' }, organisation: null,
    } as any)
    vi.mocked(sendFeedbackEmail).mockRejectedValueOnce(new Error('resend down'))
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
  })
})
