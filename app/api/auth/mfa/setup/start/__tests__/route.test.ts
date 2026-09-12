import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => {
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } }
  return { prisma, default: prisma }
})
vi.mock('otpauth', () => ({
  // Must be constructable (`new TOTP(...)`), so a plain function, not an arrow.
  TOTP: vi.fn(function (this: unknown) {
    return { secret: { base32: 'SECRET32' }, toString: () => 'otpauth://totp/x' }
  }),
}))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,AAAA') } }))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/mfa/setup/start', () => {
  it('401 without a session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled()
  })

  it('403 while mfaPending (password-only session cannot enrol a new authenticator)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', mfaPending: true },
    } as never)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled()
  })

  it('409 when TOTP is already enabled (no silent rotation)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', mfaPending: false },
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'a@b.com',
      totpEnabled: true,
    } as never)
    const res = await POST()
    expect(res.status).toBe(409)
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled()
  })

  it('200 and stores a fresh secret for an eligible admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', mfaPending: false },
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'a@b.com',
      totpEnabled: false,
    } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.secret).toBe('SECRET32')
    expect(body.qrCode).toContain('data:image/png')
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledOnce()
  })
})
