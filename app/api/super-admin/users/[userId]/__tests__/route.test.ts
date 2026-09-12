import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => {
  const prisma = { user: { findUnique: vi.fn(), count: vi.fn(), delete: vi.fn() } }
  return { prisma, default: prisma }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { DELETE } from '../route'

function req() {
  return new NextRequest('http://localhost/api/super-admin/users/u2', { method: 'DELETE' })
}
const ctx = { params: { userId: 'u2' } }

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a super admin acting on a different charity-employee account.
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: 'me', role: 'SUPER_ADMIN' },
  } as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: 'CHARITY_EMPLOYEE' } as never)
  vi.mocked(prisma.user.count).mockResolvedValue(1 as never)
  vi.mocked(prisma.user.delete).mockResolvedValue({ id: 'u2' } as never)
})

describe('DELETE /api/super-admin/users/[userId]', () => {
  it('403 for a non-super-admin caller', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'x', role: 'CHARITY_EMPLOYEE' } } as never)
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(403)
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled()
  })

  it('400 when trying to delete your own account', async () => {
    const res = await DELETE(req(), { params: { userId: 'me' } })
    expect(res.status).toBe(400)
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled()
  })

  it('404 when the target is not a charity-level user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: 'LEARNER' } as never)
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(404)
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled()
  })

  it('400 when deleting the last active Charity Admin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: 'SUPER_ADMIN' } as never)
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never)
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(400)
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled()
  })

  it('allows deleting a Charity Admin while others remain active', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: 'SUPER_ADMIN' } as never)
    vi.mocked(prisma.user.count).mockResolvedValue(2 as never)
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.user.delete)).toHaveBeenCalledWith({ where: { id: 'u2' } })
  })

  it('409 when the account has authored content (foreign-key restrict)', async () => {
    vi.mocked(prisma.user.delete).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: 'test' }),
    )
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/deactivate/i)
  })

  it('200 and deletes on the happy path', async () => {
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(vi.mocked(prisma.user.delete)).toHaveBeenCalledWith({ where: { id: 'u2' } })
  })
})
