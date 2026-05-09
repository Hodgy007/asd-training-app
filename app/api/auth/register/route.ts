import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { registerLimiter, getClientIp } from '@/lib/rate-limit'
import { getEffectiveOrgSettings } from '@/lib/org-hierarchy'
import { getPublicToolkitOrgId } from '@/lib/toolkit-registration'
import { LEAF_ROLES } from '@/types'
import { ORG_TYPES } from '@/lib/rbac'
import type { Role } from '@/types'

// Build a tuple type for z.enum from LEAF_ROLES.
const LEAF_ROLES_TUPLE = LEAF_ROLES as [Role, ...Role[]]
const ORG_TYPES_TUPLE = ORG_TYPES as unknown as [string, ...string[]]

const SCHOOL_TYPES = ['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY'] as const

const baseSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
})

const existingSchema = baseSchema.extend({
  mode: z.literal('existing'),
  organisationId: z.string().min(1).max(50),
  role: z.enum(LEAF_ROLES_TUPLE),
})

const newOrgSchema = baseSchema.extend({
  mode: z.literal('new-org'),
  orgName: z.string().min(1).max(200),
  organisationType: z.enum(ORG_TYPES_TUPLE),
  professionalCredential: z.enum(['CAREGIVER', 'CAREER_DEV_OFFICER', 'EMPLOYEE']),
})

const familyCarerSchema = baseSchema.extend({
  mode: z.literal('family-carer'),
})

const schema = z.discriminatedUnion('mode', [existingSchema, newOrgSchema, familyCarerSchema])

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || 'organisation'
  let candidate = root
  let n = 2
  // Cap the loop so a degenerate input can't spin forever.
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.organisation.findUnique({ where: { slug: candidate } })
    if (!existing) return candidate
    candidate = `${root}-${n}`
    n++
  }
  // Last-resort uniqueness — extremely unlikely to ever fire.
  return `${root}-${Date.now().toString(36)}`
}

function credentialLabel(c: 'CAREGIVER' | 'CAREER_DEV_OFFICER' | 'EMPLOYEE'): string {
  if (c === 'CAREGIVER') return 'Practitioner'
  if (c === 'CAREER_DEV_OFFICER') return 'Careers Officer'
  return 'Employee'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await registerLimiter.check(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const data = parsed.data
  const email = data.email.trim().toLowerCase()

  // Password complexity (10 chars + character classes).
  const strength = validatePassword(data.password)
  if (!strength.valid) {
    return NextResponse.json({ error: strength.error }, { status: 400 })
  }

  // SSO domain pre-check — defence-in-depth. The form already redirects on
  // SSO match; this stops a direct API hit too.
  const domain = email.split('@')[1]?.toLowerCase()
  if (domain) {
    const orgSso = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
      select: { id: true },
    })
    if (orgSso) {
      return NextResponse.json({ error: 'SSO_REQUIRED' }, { status: 400 })
    }
  }
  const enforcedCharitySso = await prisma.charitySsoConfig.findFirst({
    where: { configured: true, enforceForCharityUsers: true },
    select: { id: true },
  })
  if (enforcedCharitySso) {
    return NextResponse.json({ error: 'SSO_REQUIRED' }, { status: 400 })
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existingUser) {
    return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 })
  }

  // Hash outside any transaction. bcrypt is CPU-bound; holding a tx open while
  // hashing extends lock duration unnecessarily.
  const passwordHash = await bcrypt.hash(data.password, 12)

  if (data.mode === 'existing') {
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
      select: { id: true, active: true, pendingApproval: true, orgType: true },
    })
    if (!org || !org.active || org.pendingApproval || org.orgType !== 'ORGANISATION') {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    const settings = await getEffectiveOrgSettings(org.id)
    if (!settings.allowedRoles.includes(data.role)) {
      return NextResponse.json({ error: 'Role not permitted for this organisation' }, { status: 400 })
    }

    await prisma.user.create({
      data: {
        email,
        name: data.name,
        password: passwordHash,
        role: data.role,
        organisationId: org.id,
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      },
    })

    return NextResponse.json({
      ok: true,
      redirect: `/login?registered=1&email=${encodeURIComponent(email)}`,
    })
  }

  if (data.mode === 'new-org') {
    // Defence-in-depth: enforce credential→type pairing on the server. The
    // form gates this client-side; this is the server-side mirror.
    const employeeOk = data.professionalCredential === 'EMPLOYEE' && data.organisationType === 'EMPLOYER'
    const schoolOk =
      data.professionalCredential !== 'EMPLOYEE' &&
      (SCHOOL_TYPES as readonly string[]).includes(data.organisationType)
    if (!employeeOk && !schoolOk) {
      return NextResponse.json({ error: 'CREDENTIAL_TYPE_MISMATCH' }, { status: 400 })
    }

    const slug = await uniqueSlug(slugify(data.orgName))

    await prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: data.orgName,
          slug,
          organisationType: data.organisationType as
            | 'SCHOOL'
            | 'COLLEGE'
            | 'ACADEMY'
            | 'UNIVERSITY'
            | 'EMPLOYER',
          orgType: 'ORGANISATION',
          allowedRoles: [...LEAF_ROLES],
          allowedProgramIds: [],
          pendingApproval: true,
          active: false,
          contactName: data.name,
          contactEmail: email,
          // Stash the declared credential here so super-admin can see it on
          // the pending-orgs UI without a schema change.
          addressLine2: `Registered as: ${credentialLabel(data.professionalCredential)}`,
        },
      })

      await tx.user.create({
        data: {
          email,
          name: data.name,
          password: passwordHash,
          role: 'ORG_ADMIN',
          organisationId: org.id,
          active: true,
          pendingApproval: true,
          mustChangePassword: false,
        },
      })
    })

    const redirect =
      data.professionalCredential === 'EMPLOYEE'
        ? '/register/pending-business'
        : '/register/pending-school'

    return NextResponse.json({ ok: true, redirect })
  }

  // mode === 'family-carer'
  const publicOrgId = await getPublicToolkitOrgId()
  if (!publicOrgId) {
    console.error(
      '[auth/register] Public Toolkit Users org missing — run seed-public-toolkit-org.ts',
    )
    return NextResponse.json(
      { error: 'CATCHALL_UNAVAILABLE' },
      { status: 503 },
    )
  }

  await prisma.user.create({
    data: {
      email,
      name: data.name,
      password: passwordHash,
      role: 'FAMILY_CARER',
      organisationId: publicOrgId,
      active: true,
      pendingApproval: false,
      mustChangePassword: false,
    },
  })

  return NextResponse.json({
    ok: true,
    redirect: `/login?registered=1&email=${encodeURIComponent(email)}`,
  })
}
