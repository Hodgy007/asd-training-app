import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedbackSubmission: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '../route'

function makeReq(qs = '') {
  return new NextRequest(`http://localhost/api/super-admin/feedback${qs}`)
}

describe('GET /api/super-admin/feedback', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.findMany).mockReset().mockResolvedValue([] as any)
    vi.mocked(prisma.feedbackSubmission.count).mockReset().mockResolvedValue(0)
    vi.mocked(prisma.feedbackSubmission.groupBy).mockReset().mockResolvedValue([] as any)
  })

  it('returns 403 for non-SUPER_ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'CHARITY_EMPLOYEE' } } as any)
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it('returns 403 for ORG_ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'ORG_ADMIN' } } as any)
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it('returns items + totals + statusCounts for SUPER_ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findMany).mockResolvedValue([{ id: 'fb_1' }] as any)
    vi.mocked(prisma.feedbackSubmission.count).mockResolvedValue(1)
    vi.mocked(prisma.feedbackSubmission.groupBy).mockResolvedValue([
      { status: 'NEW', _count: { _all: 3 } } as any,
      { status: 'RESOLVED', _count: { _all: 2 } } as any,
    ])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.total).toBe(1)
    expect(json.statusCounts).toEqual({ NEW: 3, IN_PROGRESS: 0, RESOLVED: 2 })
  })

  it('passes status filter to findMany', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as any)
    await GET(makeReq('?status=NEW'))
    const args = vi.mocked(prisma.feedbackSubmission.findMany).mock.calls[0][0]
    expect(args?.where).toMatchObject({ status: 'NEW' })
  })
})
