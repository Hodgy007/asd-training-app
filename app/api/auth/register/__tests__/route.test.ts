import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    organisation: { findUnique: vi.fn(), create: vi.fn() },
    orgSsoConfig: { findFirst: vi.fn() },
    charitySsoConfig: { findFirst: vi.fn() },
    // Welcome-flow (magic-link) self-registration writes a SHA-256-hashed
    // token to PasswordResetToken alongside the user create.
    passwordResetToken: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
// sendWelcomeEmail short-circuits when RESEND_API_KEY isn't set in env,
// so we don't need to mock Resend itself for these unit tests.
vi.mock('@/lib/org-hierarchy', () => ({
  getEffectiveOrgSettings: vi.fn(),
}))
vi.mock('@/lib/toolkit-registration', () => ({
  getPublicToolkitOrgId: vi.fn(),
  // Every form role maps to LEARNER — see lib/toolkit-registration.ts.
  mapFormRoleToPlatformRole: () => 'LEARNER',
}))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'HASH') },
}))
vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit')
  return {
    ...actual,
    registerLimiter: { check: vi.fn(async () => ({ success: true })) },
    getClientIp: () => '127.0.0.1',
  }
})

import { prisma } from '@/lib/prisma'
import { getEffectiveOrgSettings } from '@/lib/org-hierarchy'
import { getPublicToolkitOrgId } from '@/lib/toolkit-registration'
import { registerLimiter } from '@/lib/rate-limit'
import { POST } from '../route'

const STRONG = 'StrongPass1!'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(registerLimiter.check).mockResolvedValue({ success: true })
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.organisation.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.orgSsoConfig.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.charitySsoConfig.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
    if (typeof cb === 'function') {
      // Pass a tx object whose models proxy to the same mocks.
      return cb(prisma)
    }
    return Promise.all(cb)
  })
})

describe('POST /api/auth/register — common', () => {
  it('429 on rate limit', async () => {
    vi.mocked(registerLimiter.check).mockResolvedValue({ success: false, retryAfterMs: 60_000 })
    const res = await POST(req({ mode: 'no-org', formRole: 'parent_carer', name: 'A', email: 'a@b.com', password: STRONG }))
    expect(res.status).toBe(429)
  })

  it('400 on weak password (new-org — the only path that takes a password)', async () => {
    const res = await POST(req({
      mode: 'new-org', name: 'A', email: 'a@b.com', password: 'short',
      orgName: 'Sunrise', organisationType: 'SCHOOL',
      professionalCredential: 'CAREGIVER',
    }))
    expect(res.status).toBe(400)
  })

  it('400 SSO_REQUIRED when domain has org SSO configured', async () => {
    vi.mocked(prisma.orgSsoConfig.findFirst).mockResolvedValue({ id: 'sso1' } as any)
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue('public-org')
    const res = await POST(req({ mode: 'no-org', formRole: 'parent_carer', name: 'A', email: 'a@school.edu', password: STRONG }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'SSO_REQUIRED' })
  })

  it('400 SSO_REQUIRED when charity SSO is enforced', async () => {
    vi.mocked(prisma.charitySsoConfig.findFirst).mockResolvedValue({ id: 'csso' } as any)
    const res = await POST(req({ mode: 'no-org', formRole: 'parent_carer', name: 'A', email: 'a@b.com', password: STRONG }))
    expect(res.status).toBe(400)
  })

  it('409 EMAIL_EXISTS when email already in use', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any)
    const res = await POST(req({ mode: 'no-org', formRole: 'parent_carer', name: 'A', email: 'a@b.com', password: STRONG }))
    expect(res.status).toBe(409)
  })

  it('400 on invalid Zod body', async () => {
    const res = await POST(req({ mode: 'existing', email: 'not-email', password: STRONG, name: 'A' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/register — existing org', () => {
  it('happy path → user created (password=null, magic-link), redirect to /register/check-email', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', name: 'Sunrise', active: true, orgType: 'ORGANISATION',
    } as any)
    vi.mocked(getEffectiveOrgSettings).mockResolvedValue({
      allowedRoles: ['LEARNER'],
      allowedProgramIds: [],
    })
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1' } as any)

    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com',
      organisationId: 'o1', role: 'LEARNER',
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    // existing-org no longer takes a password — user lands on /register/check-email
    // and finishes via the welcome email link.
    expect(data.redirect).toMatch(/^\/register\/check-email\?email=/)
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'jane@school.com',
        role: 'LEARNER',
        organisationId: 'o1',
        password: null,
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      }),
    }))
    expect(prisma.passwordResetToken.create).toHaveBeenCalled()
  })

  it('400 when role not in allowedRoles', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', name: 'Sunrise', active: true, orgType: 'ORGANISATION',
    } as any)
    vi.mocked(getEffectiveOrgSettings).mockResolvedValue({
      allowedRoles: [],
      allowedProgramIds: [],
    })
    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com',
      organisationId: 'o1', role: 'LEARNER',
    }))
    expect(res.status).toBe(400)
  })

  it('404 when org is inactive', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', name: 'Sunrise', active: false, orgType: 'ORGANISATION',
    } as any)
    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com',
      organisationId: 'o1', role: 'LEARNER',
    }))
    expect(res.status).toBe(404)
  })

  it('404 when org is a COHORT', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', name: 'Cohort', active: true, orgType: 'COHORT',
    } as any)
    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com',
      organisationId: 'o1', role: 'LEARNER',
    }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/auth/register — new org', () => {
  it('happy path → org + ORG_ADMIN created (Practitioner) with no pending gate', async () => {
    vi.mocked(prisma.organisation.create).mockResolvedValue({ id: 'new-org' } as any)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'admin' } as any)

    const res = await POST(req({
      mode: 'new-org', name: 'Pat', email: 'pat@school.com', password: STRONG,
      orgName: 'Sunrise Academy', organisationType: 'SCHOOL',
      professionalCredential: 'CAREGIVER',
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    // Pending-approval gate is gone — new-org admins sign in immediately at /login.
    expect(data.redirect).toMatch(/^\/login\?registered=1&email=/)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.organisation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Sunrise Academy',
        organisationType: 'SCHOOL',
        pendingApproval: false,
        active: true,
        addressLine2: 'Registered as: Practitioner',
      }),
    }))
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: 'ORG_ADMIN',
        organisationId: 'new-org',
        pendingApproval: false,
        active: true,
      }),
    }))
  })

  it('Employee + EMPLOYER → /login (no pending-business intermediate page)', async () => {
    vi.mocked(prisma.organisation.create).mockResolvedValue({ id: 'biz' } as any)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'admin' } as any)
    const res = await POST(req({
      mode: 'new-org', name: 'Em', email: 'em@biz.com', password: STRONG,
      orgName: 'Acme Co', organisationType: 'EMPLOYER',
      professionalCredential: 'EMPLOYEE',
    }))
    expect(res.status).toBe(200)
    expect((await res.json()).redirect).toMatch(/^\/login\?registered=1&email=/)
  })

  it('400 when Practitioner picks EMPLOYER (credential/type mismatch)', async () => {
    const res = await POST(req({
      mode: 'new-org', name: 'Pat', email: 'p@b.com', password: STRONG,
      orgName: 'X', organisationType: 'EMPLOYER',
      professionalCredential: 'CAREGIVER',
    }))
    expect(res.status).toBe(400)
  })

  it('400 when Employee picks SCHOOL', async () => {
    const res = await POST(req({
      mode: 'new-org', name: 'Em', email: 'e@b.com', password: STRONG,
      orgName: 'X', organisationType: 'SCHOOL',
      professionalCredential: 'EMPLOYEE',
    }))
    expect(res.status).toBe(400)
  })

  it('400 when professionalCredential is STUDENT (Zod rejects)', async () => {
    const res = await POST(req({
      mode: 'new-org', name: 'S', email: 's@b.com', password: STRONG,
      orgName: 'X', organisationType: 'SCHOOL',
      professionalCredential: 'STUDENT',
    }))
    expect(res.status).toBe(400)
  })

  it('slug collision → counter suffix', async () => {
    // First lookup says taken, second says free.
    let call = 0
    vi.mocked(prisma.organisation.findUnique).mockImplementation((async ({ where }: any) => {
      if (where.slug === 'sunrise-academy') return { id: 'taken' } as any
      return null
    }) as any)
    vi.mocked(prisma.organisation.create).mockImplementation((async (args: any) => {
      call++
      return { id: 'new-org', slug: args.data.slug } as any
    }) as any)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'admin' } as any)

    await POST(req({
      mode: 'new-org', name: 'Pat', email: 'p@b.com', password: STRONG,
      orgName: 'Sunrise Academy', organisationType: 'SCHOOL',
      professionalCredential: 'CAREGIVER',
    }))

    expect(prisma.organisation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ slug: 'sunrise-academy-2' }),
    }))
    expect(call).toBe(1)
  })
})

describe('POST /api/auth/register — no-org (catchall)', () => {
  it.each([
    { formRole: 'autistic',     expectedRole: 'LEARNER' },
    { formRole: 'parent_carer', expectedRole: 'LEARNER' },
    { formRole: 'supporter',    expectedRole: 'LEARNER' },
    { formRole: 'practitioner', expectedRole: 'LEARNER' },
  ])('formRole=$formRole → role=$expectedRole, attached to public-toolkit (magic-link)', async ({ formRole, expectedRole }) => {
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue('public-org')
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'no' } as any)

    const res = await POST(req({
      mode: 'no-org', formRole,
      name: 'Sam', email: `sam-${formRole}@home.com`,
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    // no-org no longer takes a password — user lands on /register/check-email.
    expect(data.redirect).toMatch(/^\/register\/check-email\?email=/)
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: expectedRole,
        organisationId: 'public-org',
        password: null,
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      }),
    }))
    expect(prisma.passwordResetToken.create).toHaveBeenCalled()
  })

  it('400 on disallowed formRole=employer (defence-in-depth — employer is not a catchall option)', async () => {
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue('public-org')
    const res = await POST(req({
      mode: 'no-org', formRole: 'employer',
      name: 'X', email: 'x@home.com',
    }))
    expect(res.status).toBe(400)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('503 CATCHALL_UNAVAILABLE when public-toolkit org missing', async () => {
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue(null)
    const res = await POST(req({
      mode: 'no-org', formRole: 'parent_carer',
      name: 'Cara', email: 'cara@home.com',
    }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'CATCHALL_UNAVAILABLE' })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
