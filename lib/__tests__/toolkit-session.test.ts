import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret-with-enough-bytes-for-hmac'
  vi.resetModules()
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.NEXTAUTH_SECRET
  else process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET
})

describe('signToolkitSession + verifyToolkitSession', () => {
  it('round-trips a valid registrant id', async () => {
    const { signToolkitSession, verifyToolkitSession } = await import('@/lib/toolkit-session')
    const token = signToolkitSession('reg_abc')
    const verified = verifyToolkitSession(token)
    expect(verified).toEqual({ registrantId: 'reg_abc' })
  })

  it('rejects a token with a tampered body', async () => {
    const { signToolkitSession, verifyToolkitSession } = await import('@/lib/toolkit-session')
    const token = signToolkitSession('reg_abc')
    const [body, sig] = token.split('.')
    // Tamper the FIRST char so all 6 base64 bits are significant — the last
    // char of an unpadded base64url string can have unused trailing bits
    // (depending on byte-count mod 3), making last-char swaps a no-op when
    // the chars share the same significant prefix.
    const tamperedBody = (body.charAt(0) === 'A' ? 'B' : 'A') + body.slice(1)
    expect(verifyToolkitSession(`${tamperedBody}.${sig}`)).toBeNull()
  })

  it('rejects a token with a tampered signature', async () => {
    const { signToolkitSession, verifyToolkitSession } = await import('@/lib/toolkit-session')
    const token = signToolkitSession('reg_abc')
    const [body, sig] = token.split('.')
    const tamperedSig = (sig.charAt(0) === 'A' ? 'B' : 'A') + sig.slice(1)
    expect(verifyToolkitSession(`${body}.${tamperedSig}`)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const { signToolkitSession, verifyToolkitSession } = await import('@/lib/toolkit-session')
    const longAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60 - 1
    const token = signToolkitSession('reg_abc', longAgo)
    expect(verifyToolkitSession(token)).toBeNull()
  })

  it('rejects garbage', async () => {
    const { verifyToolkitSession } = await import('@/lib/toolkit-session')
    expect(verifyToolkitSession('')).toBeNull()
    expect(verifyToolkitSession(null)).toBeNull()
    expect(verifyToolkitSession(undefined)).toBeNull()
    expect(verifyToolkitSession('not-a-token')).toBeNull()
    expect(verifyToolkitSession('a.b')).toBeNull()
  })
})

describe('buildToolkitSessionCookie / buildToolkitClearCookie', () => {
  it('produces a cookie header with HttpOnly, SameSite=Lax, Path=/', async () => {
    const { buildToolkitSessionCookie } = await import('@/lib/toolkit-session')
    const header = buildToolkitSessionCookie('reg_abc')
    expect(header).toMatch(/^toolkit-session=.+\..+;/)
    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).toContain('Max-Age=')
  })

  it('clears the cookie with Max-Age=0', async () => {
    const { buildToolkitClearCookie } = await import('@/lib/toolkit-session')
    const header = buildToolkitClearCookie()
    expect(header).toContain('toolkit-session=;')
    expect(header).toContain('Max-Age=0')
  })
})
