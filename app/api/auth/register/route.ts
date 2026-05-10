import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { registerLimiter, getClientIp } from '@/lib/rate-limit'
import { getEffectiveOrgSettings } from '@/lib/org-hierarchy'
import { getPublicToolkitOrgId, mapFormRoleToPlatformRole } from '@/lib/toolkit-registration'
import { LEAF_ROLES } from '@/types'
import { ORG_TYPES } from '@/lib/rbac'
import { hashResetToken } from '@/lib/reset-token'
import { renderWelcomeSetPasswordEmail } from '@/lib/email-templates/welcome'
import { logger, errMeta } from '@/lib/logger'
import type { Role } from '@/types'

// Build a tuple type for z.enum from LEAF_ROLES.
const LEAF_ROLES_TUPLE = LEAF_ROLES as [Role, ...Role[]]
const ORG_TYPES_TUPLE = ORG_TYPES as unknown as [string, ...string[]]

const SCHOOL_TYPES = ['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY'] as const

// existing + no-org users no longer choose a password during registration —
// they get a welcome email with a magic link and pick their password on
// /welcome. new-org admins still set a password inline because they need
// immediate access to start configuring their organisation.
const noPasswordBase = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
})
const passwordBase = noPasswordBase.extend({
  password: z.string().min(1).max(200),
})

const existingSchema = noPasswordBase.extend({
  mode: z.literal('existing'),
  organisationId: z.string().min(1).max(50),
  role: z.enum(LEAF_ROLES_TUPLE),
})

const newOrgSchema = passwordBase.extend({
  mode: z.literal('new-org'),
  orgName: z.string().min(1).max(200),
  organisationType: z.enum(ORG_TYPES_TUPLE),
  professionalCredential: z.enum(['CAREGIVER', 'CAREER_DEV_OFFICER', 'EMPLOYEE']),
})

const noOrgSchema = noPasswordBase.extend({
  mode: z.literal('no-org'),
  formRole: z.enum(['autistic', 'parent_carer', 'supporter', 'practitioner']),
})

const schema = z.discriminatedUnion('mode', [existingSchema, newOrgSchema, noOrgSchema])

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
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.organisation.findUnique({ where: { slug: candidate } })
    if (!existing) return candidate
    candidate = `${root}-${n}`
    n++
  }
  return `${root}-${Date.now().toString(36)}`
}

function credentialLabel(c: 'CAREGIVER' | 'CAREER_DEV_OFFICER' | 'EMPLOYEE'): string {
  if (c === 'CAREGIVER') return 'Practitioner'
  if (c === 'CAREER_DEV_OFFICER') return 'Careers Officer'
  return 'Employee'
}

/**
 * Issues a fresh PasswordResetToken row for the welcome email and returns
 * the raw token so the caller can build the URL. The DB stores only the
 * SHA-256 digest (same hardening as forgot-password).
 */
async function issueWelcomeToken(email: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { email } }),
    prisma.passwordResetToken.create({
      data: { email, token: hashResetToken(rawToken), expires },
    }),
  ])
  return rawToken
}

async function sendWelcomeEmail(params: {
  to: string
  name: string | null
  rawToken: string
  organisationName: string | null
  requestId?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    logger.error('auth.register.resend_not_configured', {
      requestId: params.requestId,
      email: params.to,
    })
    return
  }
  const welcomeUrl = `${process.env.NEXTAUTH_URL ?? ''}/welcome?token=${params.rawToken}`
  const { subject, html, text } = renderWelcomeSetPasswordEmail({
    name: params.name,
    welcomeUrl,
    organisationName: params.organisationName,
  })
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Ambitious About Autism <onboarding@resend.dev>',
      to: params.to,
      subject,
      html,
      text,
    })
    logger.info('auth.register.welcome_email_sent', { requestId: params.requestId })
  } catch (error) {
    // Surface but don't fail the registration — the user can request a fresh
    // token via forgot-password if delivery fails downstream.
    logger.error('auth.register.welcome_email_failed', {
      requestId: params.requestId,
      ...errMeta(error),
    })
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined
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

  // Password complexity only applies to new-org (the only path that takes a
  // password during registration).
  if (data.mode === 'new-org') {
    const strength = validatePassword(data.password)
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 })
    }
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

  if (data.mode === 'existing') {
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
      select: { id: true, name: true, active: true, orgType: true },
    })
    if (!org || !org.active || org.orgType !== 'ORGANISATION') {
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
        password: null, // welcome-flow user — chooses password on /welcome
        role: data.role,
        organisationId: org.id,
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      },
    })

    const rawToken = await issueWelcomeToken(email)
    await sendWelcomeEmail({
      to: email,
      name: data.name,
      rawToken,
      organisationName: org.name,
      requestId,
    })

    return NextResponse.json({
      ok: true,
      redirect: `/register/check-email?email=${encodeURIComponent(email)}`,
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
    const passwordHash = await bcrypt.hash(data.password, 12)

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
          // Free self-registration — no admin approval gate.
          pendingApproval: false,
          active: true,
          contactName: data.name,
          contactEmail: email,
          // Stash the declared credential here so super-admin can see who
          // registered the org without a schema change.
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
          pendingApproval: false,
          mustChangePassword: false,
        },
      })
    })

    return NextResponse.json({
      ok: true,
      redirect: `/login?registered=1&email=${encodeURIComponent(email)}`,
    })
  }

  // mode === 'no-org'
  const publicOrgId = await getPublicToolkitOrgId()
  if (!publicOrgId) {
    logger.error('auth.register.public_toolkit_org_missing', { requestId })
    return NextResponse.json({ error: 'CATCHALL_UNAVAILABLE' }, { status: 503 })
  }

  const platformRole = mapFormRoleToPlatformRole(data.formRole)

  await prisma.user.create({
    data: {
      email,
      name: data.name,
      password: null, // welcome-flow user — chooses password on /welcome
      role: platformRole,
      organisationId: publicOrgId,
      active: true,
      pendingApproval: false,
      mustChangePassword: false,
    },
  })

  const rawToken = await issueWelcomeToken(email)
  await sendWelcomeEmail({
    to: email,
    name: data.name,
    rawToken,
    organisationName: null,
    requestId,
  })

  return NextResponse.json({
    ok: true,
    redirect: `/register/check-email?email=${encodeURIComponent(email)}`,
  })
}
