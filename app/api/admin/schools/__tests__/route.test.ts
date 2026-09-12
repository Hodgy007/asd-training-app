import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => {
  const prisma = { organisation: { findUnique: vi.fn(), create: vi.fn() } }
  return { prisma, default: prisma }
})
vi.mock('@/lib/org-hierarchy', () => ({ getEffectiveOrgSettings: vi.fn() }))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgSettings } from '@/lib/org-hierarchy'
import { POST } from '../route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/schools', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: 'a1', role: 'ORG_ADMIN', organisationId: 'parent', isParentOrg: true },
  } as never)
  // Parent-org check reads isParentOrg.
  vi.mocked(prisma.organisation.findUnique).mockResolvedValue({ isParentOrg: true } as never)
})

describe('POST /api/admin/schools — programme entitlement', () => {
  it('rejects granting a child org programmes the parent does not have', async () => {
    vi.mocked(getEffectiveOrgSettings).mockResolvedValue({
      allowedProgramIds: ['p1'],
      allowedRoles: ['LEARNER'],
    } as never)

    const res = await POST(
      req({ name: 'Child', slug: 'child-school', allowedProgramIds: ['p1', 'p2'] }),
    )
    expect(res.status).toBe(400)
    expect(vi.mocked(prisma.organisation.create)).not.toHaveBeenCalled()
  })

  it('403 when the caller is not a parent org', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({ isParentOrg: false } as never)
    const res = await POST(req({ name: 'Child', slug: 'child-school' }))
    expect(res.status).toBe(403)
    expect(vi.mocked(prisma.organisation.create)).not.toHaveBeenCalled()
  })
})
