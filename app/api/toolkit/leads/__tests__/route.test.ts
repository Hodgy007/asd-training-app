import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => {
  const prisma = {
    libraryDocument: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    toolkitRegistrant: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  }
  return { prisma, default: prisma }
})
vi.mock('@/lib/rate-limit', () => ({
  toolkitLeadLimiter: { check: vi.fn(async () => ({ success: true })) },
  getClientIp: () => '127.0.0.1',
}))
vi.mock('@/lib/toolkit', () => ({ recordToolkitDocumentEvent: vi.fn(async () => ({ recorded: true })) }))
vi.mock('@/lib/toolkit-session', () => ({ buildToolkitSessionCookie: () => 'toolkit-session=x' }))
vi.mock('@/lib/toolkit-registration', () => ({
  TOOLKIT_FORM_ROLES: ['autistic', 'parent_carer', 'practitioner', 'employer', 'supporter'],
  PUBLIC_TOOLKIT_ORG_SLUG: 'public-toolkit',
  getPublicToolkitOrgId: vi.fn(async () => 'public-org'),
  mapFormRoleToPlatformRole: () => 'LEARNER',
}))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async () => 'HASH') } }))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/toolkit/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue(null as never)
  vi.mocked(prisma.libraryDocument.findFirst).mockResolvedValue({ id: 'doc1' } as never)
  vi.mocked(prisma.toolkitRegistrant.findUnique).mockResolvedValue(null as never)
  vi.mocked(prisma.toolkitRegistrant.create).mockResolvedValue({ id: 'reg1' } as never)
})

const base = {
  documentId: 'doc1',
  name: 'Test Person',
  email: 'victim@charity.org',
  formRole: 'supporter',
  register: true,
  password: 'StrongPass1!',
}

describe('POST /api/toolkit/leads — never writes to an existing account', () => {
  it('409s an org-less existing user (e.g. a charity admin) and leaves the password untouched', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'admin1',
      organisationId: null,
      password: 'EXISTING_HASH',
    } as never)

    const res = await POST(req(base))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('email_in_use')
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled()
  })

  it('409s an existing Public Toolkit user rather than resetting their password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'pub1',
      organisationId: 'public-org',
      password: null,
    } as never)

    const res = await POST(req(base))
    expect(res.status).toBe(409)
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled()
  })

  it('creates a brand-new user when no account exists for the email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'new1' } as never)
    vi.mocked(prisma.toolkitRegistrant.update).mockResolvedValue({} as never)

    const res = await POST(req(base))
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledOnce()
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled()
  })
})
