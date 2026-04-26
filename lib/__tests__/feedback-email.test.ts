import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn() },
  },
}))

const sendMock = vi.fn()
vi.mock('resend', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn(function () { return { emails: { send: sendMock } } } as any),
}))

import { prisma } from '@/lib/prisma'
import { buildFeedbackEmail, sendFeedbackEmail } from '../feedback-email'

const baseSubmission = {
  id: 'fb_1',
  type: 'BUG' as const,
  message: 'Quiz won\'t submit on Module 3',
  url: 'https://example.com/training',
  userAgent: 'Mozilla/5.0',
  viewport: '1920x1080',
  clientLogs: [{ level: 'error', message: 'boom <script>', ts: 1700000000000 }],
  createdAt: new Date('2026-04-26T10:00:00Z'),
  user: { name: 'Alice', email: 'a@example.com', role: 'CAREGIVER' },
  organisation: { name: 'Example Org' },
}

describe('buildFeedbackEmail', () => {
  it('formats the subject as [Feedback - <Type>] <preview>', () => {
    const { subject } = buildFeedbackEmail(baseSubmission, 'http://x')
    expect(subject).toBe('[Feedback - Bug] Quiz won\'t submit on Module 3')
  })

  it('truncates long messages in the subject to 60 chars + ellipsis', () => {
    const long = 'x'.repeat(120)
    const { subject } = buildFeedbackEmail({ ...baseSubmission, message: long }, 'http://x')
    expect(subject).toBe(`[Feedback - Bug] ${'x'.repeat(60)}…`)
  })

  it('escapes HTML in message and log entries', () => {
    const { html } = buildFeedbackEmail(baseSubmission, 'http://x')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('includes a clickable admin link', () => {
    const { html } = buildFeedbackEmail(baseSubmission, 'https://app.example.com')
    expect(html).toContain('https://app.example.com/super-admin/feedback/fb_1')
  })
})

describe('sendFeedbackEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
    vi.mocked(prisma.user.findMany).mockReset()
    process.env.RESEND_API_KEY = 'test_key'
    process.env.NEXTAUTH_URL = 'https://app.example.com'
  })

  it('sends only to active SUPER_ADMINs', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { email: 'admin1@example.com' },
      { email: 'admin2@example.com' },
    ] as any)
    sendMock.mockResolvedValue({ data: {} })
    await sendFeedbackEmail(baseSubmission)
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'SUPER_ADMIN', active: true },
      select: { email: true },
    })
    expect(sendMock).toHaveBeenCalledOnce()
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toEqual(['admin1@example.com', 'admin2@example.com'])
  })

  it('logs a warning and returns without throwing when there are no recipients', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(sendFeedbackEmail(baseSubmission)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
