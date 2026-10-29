// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'

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
  getRedis: () => null,
}))

import { prisma } from '@/lib/prisma'
import { authOptions, SIGN_IN_UNAVAILABLE } from '../auth'

type Authorize = (
  credentials: Record<string, string> | undefined,
  req: { headers: Record<string, string> },
) => Promise<Record<string, unknown> | null>

const authorize = (
  authOptions.providers.find((p) => (p as { id?: string }).id === 'credentials') as unknown as {
    options: { authorize: Authorize }
  }
).options.authorize

const findUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>

// Shaped like the real Prisma message that reached the login page.
const PRISMA_ERROR = new Error(
  'Invalid `prisma.user.findUnique()` invocation:\n\nAuthentication failed against database server at ' +
    '`ep-example-pooler.eastus2.azure.neon.tech`, the provided database credentials are not valid.',
)

let consoleError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  findUnique.mockReset()
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
})

describe('credentials authorize — error messages shown on the login page', () => {
  it('replaces an unexpected database error with a neutral message', async () => {
    findUnique.mockRejectedValue(PRISMA_ERROR)

    const result = authorize({ email: 'someone@example.com', password: 'whatever' }, { headers: {} })

    await expect(result).rejects.toThrow(SIGN_IN_UNAVAILABLE)
    await expect(result).rejects.not.toThrow(/neon\.tech|prisma/i)
  })

  it('logs the real error server-side', async () => {
    findUnique.mockRejectedValue(PRISMA_ERROR)

    await authorize({ email: 'someone@example.com', password: 'whatever' }, { headers: {} }).catch(() => {})

    expect(consoleError).toHaveBeenCalledTimes(1)
    const line = String(consoleError.mock.calls[0][0])
    expect(line).toContain('credentials sign-in failed unexpectedly')
    expect(line).toContain('neon.tech')
  })

  it('also covers failures on the MFA step', async () => {
    findUnique.mockRejectedValue(PRISMA_ERROR)

    await expect(
      authorize({ email: 'someone@example.com', totpCode: '123456' }, { headers: {} }),
    ).rejects.toThrow(SIGN_IN_UNAVAILABLE)
  })

  it('still shows the generic credentials error for a wrong password', async () => {
    findUnique.mockResolvedValue(null)

    await expect(
      authorize({ email: 'nobody@example.com', password: 'wrong' }, { headers: {} }),
    ).rejects.toThrow('Invalid email or password')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('still shows account-state messages once the password is correct', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ada@example.com',
      password: await bcrypt.hash('right-password', 4),
      active: false,
      organisation: { active: true },
    })

    await expect(
      authorize({ email: 'ada@example.com', password: 'right-password' }, { headers: {} }),
    ).rejects.toThrow('Your account has been deactivated. Please contact an administrator.')
    expect(consoleError).not.toHaveBeenCalled()
  })
})
