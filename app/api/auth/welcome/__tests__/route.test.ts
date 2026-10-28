import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const tx = {
  user: { update: vi.fn() },
  passwordResetToken: { delete: vi.fn() },
}

vi.mock('@/lib/prisma', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    passwordResetToken: { findUnique: vi.fn() },
    organisation: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  }
  return { prisma, default: prisma }
})
vi.mock('next-auth/jwt', () => ({ encode: vi.fn(async () => 'signed-session-token') }))
vi.mock('@/lib/rate-limit', () => ({
  resetPasswordLimiter: { check: vi.fn(async () => ({ success: true, retryAfterMs: 0 })) },
  getClientIp: () => '127.0.0.1',
}))
vi.mock('@/lib/modules', () => ({ getUserPrograms: vi.fn(async () => []) }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errMeta: () => ({}),
}))

import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hashResetToken, TOKEN_PURPOSE } from '@/lib/reset-token'
import { GET, POST } from '../route'

const GOOD_PASSWORD = 'Str0ng!Passw0rd'
const RAW_TOKEN = 'raw-token-value'

const future = () => new Date(Date.now() + 60 * 60 * 1000)

function row(overrides: Partial<{ purpose: string; expires: Date }> = {}) {
  return {
    id: 'r1',
    email: 'user@example.com',
    token: hashResetToken(RAW_TOKEN),
    purpose: TOKEN_PURPOSE.WELCOME as string,
    expires: future(),
    createdAt: new Date(),
    ...overrides,
  }
}

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'user@example.com',
    name: 'Una User',
    role: 'LEARNER',
    organisationId: null,
    totpEnabled: false,
    charityPermissions: [],
    ...overrides,
  }
}

function postReq() {
  return new NextRequest('http://localhost/api/auth/welcome', {
    method: 'POST',
    body: JSON.stringify({ token: RAW_TOKEN, password: GOOD_PASSWORD }),
    headers: { 'content-type': 'application/json' },
  })
}

function getReq() {
  return new NextRequest(`http://localhost/api/auth/welcome?token=${RAW_TOKEN}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    active: true,
    organisation: null,
  } as never)
  tx.user.update.mockResolvedValue(dbUser() as never)
  tx.passwordResetToken.delete.mockResolvedValue({} as never)
})

describe('POST /api/auth/welcome', () => {
  it.each([TOKEN_PURPOSE.RESET, TOKEN_PURPOSE.ACTIVATION])(
    'rejects a %s-purpose token (cannot be exchanged for a session)',
    async (purpose) => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row({ purpose }) as never)
      const res = await POST(postReq())
      expect(res.status).toBe(400)
      expect(tx.user.update).not.toHaveBeenCalled()
      expect(encode).not.toHaveBeenCalled()
      expect(res.headers.get('set-cookie')).toBeNull()
    },
  )

  it('rejects an expired token', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(
      row({ expires: new Date(Date.now() - 1000) }) as never,
    )
    const res = await POST(postReq())
    expect(res.status).toBe(400)
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(encode).not.toHaveBeenCalled()
  })

  it('rejects an unknown token', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null as never)
    const res = await POST(postReq())
    expect(res.status).toBe(400)
    expect(encode).not.toHaveBeenCalled()
  })

  it('rejects an inactive user without reactivating them', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row() as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ active: false, organisation: null } as never)
    const res = await POST(postReq())
    expect(res.status).toBe(400)
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(encode).not.toHaveBeenCalled()
  })

  it('rejects a user in an inactive organisation', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row() as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      organisation: { active: false },
    } as never)
    const res = await POST(postReq())
    expect(res.status).toBe(400)
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(encode).not.toHaveBeenCalled()
  })

  it('rejects when the user no longer exists', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row() as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never)
    const res = await POST(postReq())
    expect(res.status).toBe(400)
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('sets the password without touching `active`, consumes the token, and signs in', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row() as never)
    const res = await POST(postReq())
    expect(res.status).toBe(200)

    const updateArgs = tx.user.update.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ email: 'user@example.com' })
    expect(updateArgs.data.password).toEqual(expect.any(String))
    expect(updateArgs.data.password).not.toBe(GOOD_PASSWORD)
    expect(updateArgs.data.mustChangePassword).toBe(false)
    expect(updateArgs.data).not.toHaveProperty('active')
    expect(tx.passwordResetToken.delete).toHaveBeenCalledWith({ where: { token: hashResetToken(RAW_TOKEN) } })

    const encodeArgs = vi.mocked(encode).mock.calls[0][0]
    expect(encodeArgs.token).toMatchObject({ id: 'u1', mfaPending: false, totpEnabled: false })
    expect(res.headers.get('set-cookie')).toContain('next-auth.session-token=signed-session-token')
  })

  it('mints a session with mfaPending=true for a TOTP-enabled user', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row() as never)
    tx.user.update.mockResolvedValue(dbUser({ totpEnabled: true }) as never)
    const res = await POST(postReq())
    expect(res.status).toBe(200)

    const encodeArgs = vi.mocked(encode).mock.calls[0][0]
    expect(encodeArgs.token).toMatchObject({ id: 'u1', totpEnabled: true, mfaPending: true })
  })
})

describe('GET /api/auth/welcome', () => {
  it.each([TOKEN_PURPOSE.RESET, TOKEN_PURPOSE.ACTIVATION])(
    'rejects a %s-purpose token',
    async (purpose) => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row({ purpose }) as never)
      const res = await GET(getReq())
      expect(res.status).toBe(400)
    },
  )

  it('rejects an expired token', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(
      row({ expires: new Date(Date.now() - 1000) }) as never,
    )
    const res = await GET(getReq())
    expect(res.status).toBe(400)
  })

  it('returns the account summary for a valid WELCOME token', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(row() as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: 'Una User',
      email: 'user@example.com',
      organisation: { name: 'Acme School' },
    } as never)
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      email: 'user@example.com',
      name: 'Una User',
      organisationName: 'Acme School',
    })
  })
})
