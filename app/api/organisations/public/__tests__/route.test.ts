import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET } from '../route'

function get(url: string) {
  return new NextRequest(url)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.organisation.findMany).mockResolvedValue([])
})

describe('GET /api/organisations/public', () => {
  it('returns empty array when search is missing or too short', async () => {
    const res = await GET(get('http://localhost/api/organisations/public'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    expect(prisma.organisation.findMany).not.toHaveBeenCalled()

    const res2 = await GET(get('http://localhost/api/organisations/public?search=a'))
    expect(await res2.json()).toEqual([])
    expect(prisma.organisation.findMany).not.toHaveBeenCalled()
  })

  it('passes search + limit and excludes pending/COHORT/inactive orgs', async () => {
    await GET(get('http://localhost/api/organisations/public?search=foo&limit=10'))
    expect(prisma.organisation.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        pendingApproval: false,
        orgType: 'ORGANISATION',
        name: { contains: 'foo', mode: 'insensitive' },
      },
      select: { id: true, name: true, organisationType: true },
      orderBy: { name: 'asc' },
      take: 10,
    })
  })

  it('caps limit at 50', async () => {
    await GET(get('http://localhost/api/organisations/public?search=foo&limit=999'))
    const call = vi.mocked(prisma.organisation.findMany).mock.calls[0][0] as any
    expect(call.take).toBe(50)
  })
})
