import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedbackSubmission: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET, PATCH } from '../[id]/route'

function getReq() { return new NextRequest('http://localhost/api/super-admin/feedback/fb_1') }
function patchReq(body: unknown) {
  return new NextRequest('http://localhost/api/super-admin/feedback/fb_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: 'fb_1' }) }

describe('GET /api/super-admin/feedback/[id]', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.findUnique).mockReset()
  })

  it('403 for non-super-admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'ORG_ADMIN' } } as any)
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(403)
  })

  it('404 when not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue(null)
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(404)
  })

  it('returns submission with user + organisation joined', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ id: 'fb_1' } as any)
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.feedbackSubmission.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: 'fb_1' },
      include: expect.objectContaining({
        user: expect.any(Object),
        organisation: expect.any(Object),
        resolvedBy: expect.any(Object),
      }),
    })
  })
})

describe('PATCH /api/super-admin/feedback/[id]', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.update).mockReset()
    vi.mocked(prisma.feedbackSubmission.findUnique).mockReset()
  })

  it('403 for non-super-admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'CHARITY_EMPLOYEE' } } as any)
    const res = await PATCH(patchReq({ status: 'RESOLVED' }), ctx)
    expect(res.status).toBe(403)
  })

  it('stamps resolvedAt and resolvedById when transitioning to RESOLVED', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ status: 'NEW' } as any)
    vi.mocked(prisma.feedbackSubmission.update).mockResolvedValue({ id: 'fb_1' } as any)
    await PATCH(patchReq({ status: 'RESOLVED' }), ctx)
    const args = vi.mocked(prisma.feedbackSubmission.update).mock.calls[0][0]
    expect((args.data as any).resolvedAt).toBeInstanceOf(Date)
    expect((args.data as any).resolvedById).toBe('admin1')
  })

  it('clears resolvedAt and resolvedById when moving back to NEW', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ status: 'RESOLVED' } as any)
    vi.mocked(prisma.feedbackSubmission.update).mockResolvedValue({ id: 'fb_1' } as any)
    await PATCH(patchReq({ status: 'NEW' }), ctx)
    const args = vi.mocked(prisma.feedbackSubmission.update).mock.calls[0][0]
    expect((args.data as any).resolvedAt).toBeNull()
    expect((args.data as any).resolvedById).toBeNull()
  })

  it('400 on invalid status', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ status: 'NEW' } as any)
    const res = await PATCH(patchReq({ status: 'BOGUS' }), ctx)
    expect(res.status).toBe(400)
  })
})
