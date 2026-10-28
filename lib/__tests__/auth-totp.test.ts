// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real encode() + real getToken() are used so the cookie plumbing (Cookie
// header -> chunk reassembly -> decrypt) is exercised end to end.
const SECRET = 'test-secret-test-secret-test-secret-1234'

// The global test setup stubs @/lib/auth; this file tests the real module.
vi.mock('@/lib/auth', async () => await vi.importActual('../auth'))
vi.mock('@/lib/prisma', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    organisation: { findUnique: vi.fn() },
  }
  return { prisma, default: prisma }
})
vi.mock('@/lib/modules', () => ({ getUserPrograms: vi.fn(async () => []) }))
vi.mock('@/lib/rate-limit', () => ({
  mfaVerifyLimiter: { check: vi.fn(async () => ({ success: true, retryAfterMs: 0 })) },
}))
vi.mock('otpauth', () => {
  const validate = vi.fn()
  const TOTP = vi.fn(function (this: unknown) {
    return { validate }
  })
  return { TOTP, __validate: validate }
})

import { encode as encodeJwt } from 'next-auth/jwt'
import * as otpauth from 'otpauth'
import { prisma } from '@/lib/prisma'
import { mfaVerifyLimiter } from '@/lib/rate-limit'
import { authOptions } from '../auth'

// Test tokens are partial on purpose (the real JWT type has a dozen required fields).
const encode = (params: { token: Record<string, unknown>; secret: string }) =>
  encodeJwt(params as never)

type Authorize = (
  credentials: Record<string, string> | undefined,
  req: { headers: Record<string, string>; query?: unknown; body?: unknown; method?: string },
) => Promise<Record<string, unknown> | null>

const credentialsProvider = authOptions.providers.find(
  (p) => (p as { id?: string }).id === 'credentials',
) as unknown as { options: { authorize: Authorize } }
const authorize = credentialsProvider.options.authorize

const validate = (otpauth as unknown as { __validate: ReturnType<typeof vi.fn> }).__validate

const USER = {
  id: 'u1',
  email: 'admin@example.com',
  name: 'Ada Admin',
  role: 'ORG_ADMIN',
  organisationId: 'o1',
  mustChangePassword: false,
  totpEnabled: true,
  totpSecret: 'JBSWY3DPEHPK3PXP',
  active: true,
  organisation: { active: true },
}

async function cookieFor(token: Record<string, unknown>, name = 'next-auth.session-token') {
  const jwt = await encode({ token, secret: SECRET })
  return { cookie: `${name}=${jwt}` }
}

const creds = { email: USER.email, totpCode: '123456' }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXTAUTH_SECRET = SECRET
  delete process.env.NEXTAUTH_URL
  delete process.env.VERCEL
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER } as never)
  vi.mocked(mfaVerifyLimiter.check).mockResolvedValue({ success: true, retryAfterMs: 0 } as never)
  validate.mockReturnValue(0)
})

describe('authorize() TOTP branch', () => {
  it('rejects when the request carries no session cookie', async () => {
    await expect(authorize(creds, { headers: {} })).rejects.toThrow('Invalid email or password')
    expect(validate).not.toHaveBeenCalled()
    expect(mfaVerifyLimiter.check).not.toHaveBeenCalled()
  })

  it('rejects when the session cookie is garbage', async () => {
    await expect(
      authorize(creds, { headers: { cookie: 'next-auth.session-token=not-a-jwt' } }),
    ).rejects.toThrow('Invalid email or password')
    expect(validate).not.toHaveBeenCalled()
  })

  it('rejects a token signed with a different secret', async () => {
    const jwt = await encode({
      token: { id: 'u1', mfaPending: true },
      secret: 'some-other-secret-value-1234567890',
    })
    await expect(
      authorize(creds, { headers: { cookie: `next-auth.session-token=${jwt}` } }),
    ).rejects.toThrow('Invalid email or password')
  })

  it('rejects when the session is already fully authenticated (mfaPending false)', async () => {
    const headers = await cookieFor({ id: 'u1', mfaPending: false })
    await expect(authorize(creds, { headers })).rejects.toThrow('Invalid email or password')
    expect(validate).not.toHaveBeenCalled()
  })

  it('rejects when mfaPending is missing from the token (e.g. an SSO intent JWT)', async () => {
    const headers = await cookieFor({ id: 'u1' })
    await expect(authorize(creds, { headers })).rejects.toThrow('Invalid email or password')
  })

  it('rejects when the pending token belongs to a different user', async () => {
    const headers = await cookieFor({ id: 'someone-else', mfaPending: true })
    await expect(authorize(creds, { headers })).rejects.toThrow('Invalid email or password')
    expect(validate).not.toHaveBeenCalled()
    expect(mfaVerifyLimiter.check).not.toHaveBeenCalled()
  })

  it('rejects an unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never)
    const headers = await cookieFor({ id: 'u1', mfaPending: true })
    await expect(authorize(creds, { headers })).rejects.toThrow('Invalid email or password')
  })

  it('rejects when rate limited, keyed by user id, before validating the code', async () => {
    vi.mocked(mfaVerifyLimiter.check).mockResolvedValue({ success: false, retryAfterMs: 1000 } as never)
    const headers = await cookieFor({ id: 'u1', mfaPending: true })
    await expect(authorize(creds, { headers })).rejects.toThrow(
      'Too many MFA attempts. Please try again later.',
    )
    expect(mfaVerifyLimiter.check).toHaveBeenCalledWith('mfa:u1')
    expect(validate).not.toHaveBeenCalled()
  })

  it('rejects an invalid code even with a matching pending session', async () => {
    validate.mockReturnValue(null)
    const headers = await cookieFor({ id: 'u1', mfaPending: true })
    await expect(authorize(creds, { headers })).rejects.toThrow('Invalid MFA code')
  })

  it('still blocks a deactivated user after a valid code', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, active: false } as never)
    const headers = await cookieFor({ id: 'u1', mfaPending: true })
    await expect(authorize(creds, { headers })).rejects.toThrow(/deactivated/)
  })

  it('accepts a valid code with a matching pending session', async () => {
    const headers = await cookieFor({ id: 'u1', mfaPending: true })
    const user = await authorize(creds, { headers })
    expect(mfaVerifyLimiter.check).toHaveBeenCalledWith('mfa:u1')
    expect(user).toMatchObject({ id: 'u1', email: USER.email, totpEnabled: true, mfaPending: false })
  })

  it('reads the __Secure- prefixed cookie when NEXTAUTH_URL is https', async () => {
    process.env.NEXTAUTH_URL = 'https://example.com'
    const headers = await cookieFor({ id: 'u1', mfaPending: true }, '__Secure-next-auth.session-token')
    const user = await authorize(creds, { headers })
    expect(user).toMatchObject({ id: 'u1', mfaPending: false })
  })

  it('reassembles a chunked session cookie (.0 / .1) among unrelated cookies', async () => {
    const jwt = await encode({ token: { id: 'u1', mfaPending: true }, secret: SECRET })
    const mid = Math.floor(jwt.length / 2)
    const cookie = [
      'theme=dark',
      `next-auth.session-token.1=${jwt.slice(mid)}`,
      `next-auth.session-token.0=${jwt.slice(0, mid)}`,
      'other=1',
    ].join('; ')
    const user = await authorize(creds, { headers: { cookie } })
    expect(user).toMatchObject({ id: 'u1', mfaPending: false })
  })
})
