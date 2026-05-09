import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    organisation: { findUnique: vi.fn(), create: vi.fn() },
    orgSsoConfig: { findFirst: vi.fn() },
    charitySsoConfig: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/org-hierarchy', () => ({
  getEffectiveOrgSettings: vi.fn(),
}))
vi.mock('@/lib/toolkit-registration', () => ({
  getPublicToolkitOrgId: vi.fn(),
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
    const res = await POST(req({ mode: 'family-carer', name: 'A', email: 'a@b.com', password: STRONG }))
    expect(res.status).toBe(429)
  })

  it('400 on weak password', async () => {
    const res = await POST(req({ mode: 'family-carer', name: 'A', email: 'a@b.com', password: 'short' }))
    expect(res.status).toBe(400)
  })

  it('400 SSO_REQUIRED when domain has org SSO configured', async () => {
    vi.mocked(prisma.orgSsoConfig.findFirst).mockResolvedValue({ id: 'sso1' } as any)
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue('public-org')
    const res = await POST(req({ mode: 'family-carer', name: 'A', email: 'a@school.edu', password: STRONG }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'SSO_REQUIRED' })
  })

  it('400 SSO_REQUIRED when charity SSO is enforced', async () => {
    vi.mocked(prisma.charitySsoConfig.findFirst).mockResolvedValue({ id: 'csso' } as any)
    const res = await POST(req({ mode: 'family-carer', name: 'A', email: 'a@b.com', password: STRONG }))
    expect(res.status).toBe(400)
  })

  it('409 EMAIL_EXISTS when email already in use', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any)
    const res = await POST(req({ mode: 'family-carer', name: 'A', email: 'a@b.com', password: STRONG }))
    expect(res.status).toBe(409)
  })

  it('400 on invalid Zod body', async () => {
    const res = await POST(req({ mode: 'existing', email: 'not-email', password: STRONG, name: 'A' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/register — existing org', () => {
  it('happy path → user created and redirect URL set', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', active: true, pendingApproval: false, orgType: 'ORGANISATION',
    } as any)
    vi.mocked(getEffectiveOrgSettings).mockResolvedValue({
      allowedRoles: ['STUDENT', 'CAREGIVER'],
      allowedProgramIds: [],
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
    })
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1' } as any)

    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com', password: STRONG,
      organisationId: 'o1', role: 'STUDENT',
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.redirect).toMatch(/^\/login\?registered=1&email=/)
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'jane@school.com',
        role: 'STUDENT',
        organisationId: 'o1',
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      }),
    }))
  })

  it('400 when role not in allowedRoles', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', active: true, pendingApproval: false, orgType: 'ORGANISATION',
    } as any)
    vi.mocked(getEffectiveOrgSettings).mockResolvedValue({
      allowedRoles: ['STUDENT'],
      allowedProgramIds: [],
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
    })
    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com', password: STRONG,
      organisationId: 'o1', role: 'CAREGIVER',
    }))
    expect(res.status).toBe(400)
  })

  it('404 when org pending', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', active: true, pendingApproval: true, orgType: 'ORGANISATION',
    } as any)
    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com', password: STRONG,
      organisationId: 'o1', role: 'STUDENT',
    }))
    expect(res.status).toBe(404)
  })

  it('404 when org is a COHORT', async () => {
    vi.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: 'o1', active: true, pendingApproval: false, orgType: 'COHORT',
    } as any)
    const res = await POST(req({
      mode: 'existing', name: 'Jane', email: 'jane@school.com', password: STRONG,
      organisationId: 'o1', role: 'STUDENT',
    }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/auth/register — new org', () => {
  it('happy path → org + ORG_ADMIN created (Practitioner)', async () => {
    vi.mocked(prisma.organisation.create).mockResolvedValue({ id: 'new-org' } as any)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'admin' } as any)

    const res = await POST(req({
      mode: 'new-org', name: 'Pat', email: 'pat@school.com', password: STRONG,
      orgName: 'Sunrise Academy', organisationType: 'SCHOOL',
      professionalCredential: 'CAREGIVER',
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.redirect).toBe('/register/pending-school')
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.organisation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Sunrise Academy',
        organisationType: 'SCHOOL',
        pendingApproval: true,
        active: false,
        addressLine2: 'Registered as: Practitioner',
      }),
    }))
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: 'ORG_ADMIN',
        organisationId: 'new-org',
        pendingApproval: true,
        active: true,
      }),
    }))
  })

  it('Employee + EMPLOYER → /register/pending-business', async () => {
    vi.mocked(prisma.organisation.create).mockResolvedValue({ id: 'biz' } as any)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'admin' } as any)
    const res = await POST(req({
      mode: 'new-org', name: 'Em', email: 'em@biz.com', password: STRONG,
      orgName: 'Acme Co', organisationType: 'EMPLOYER',
      professionalCredential: 'EMPLOYEE',
    }))
    expect(res.status).toBe(200)
    expect((await res.json()).redirect).toBe('/register/pending-business')
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
    vi.mocked(prisma.organisation.findUnique).mockImplementation(async ({ where }: any) => {
      if (where.slug === 'sunrise-academy') return { id: 'taken' } as any
      return null
    })
    vi.mocked(prisma.organisation.create).mockImplementation(async (args: any) => {
      call++
      return { id: 'new-org', slug: args.data.slug } as any
    })
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

describe('POST /api/auth/register — family carer', () => {
  it('happy path → user attached to public toolkit org, redirect to login', async () => {
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue('public-org')
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'fc' } as any)

    const res = await POST(req({
      mode: 'family-carer', name: 'Cara', email: 'cara@home.com', password: STRONG,
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.redirect).toMatch(/^\/login\?registered=1/)
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: 'FAMILY_CARER',
        organisationId: 'public-org',
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      }),
    }))
  })

  it('503 CATCHALL_UNAVAILABLE when public-toolkit org missing', async () => {
    vi.mocked(getPublicToolkitOrgId).mockResolvedValue(null)
    const res = await POST(req({
      mode: 'family-carer', name: 'Cara', email: 'cara@home.com', password: STRONG,
    }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'CATCHALL_UNAVAILABLE' })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
