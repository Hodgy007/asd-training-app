import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/rbac', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rbac')>('@/lib/rbac')
  return { ...actual, hasPermission: vi.fn(() => true) }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { PATCH } from '../route'

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/super-admin/organisations/pending', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: 'admin', role: 'SUPER_ADMIN' },
  } as any)
  vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) =>
    Array.isArray(ops) ? Promise.all(ops) : ops,
  )
})

describe('PATCH /api/super-admin/organisations/pending — approve', () => {
  it('flips org pendingApproval=false AND every pending user in that org', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', name: 'Sunrise Academy', pendingApproval: true,
    } as any)

    const res = await PATCH(patchRequest({ orgId: 'o1', action: 'approve' }))
    expect(res.status).toBe(200)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { pendingApproval: false, active: true },
    })
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { organisationId: 'o1', pendingApproval: true },
      data: { pendingApproval: false },
    })
  })
})
