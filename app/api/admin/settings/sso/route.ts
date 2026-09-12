import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { LEAF_ROLES } from '@/types'
import { z } from 'zod'
import { PUBLIC_MAILBOX_DOMAINS, EMAIL_DOMAIN_RE } from '@/lib/saml'

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      return new URL(v).protocol === 'https:'
    } catch {
      return false
    }
  }, 'Must be an https URL')

// emailDomain drives which users are forced through this IdP (see
// /api/auth/sso-check + /register). It must be a real domain the org owns,
// never a public mailbox (which would capture every consumer-email user).
const putSchema = z.object({
  emailDomain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(EMAIL_DOMAIN_RE, 'Enter a valid domain (e.g. school.ac.uk)')
    .refine((d) => !PUBLIC_MAILBOX_DOMAINS.has(d), 'Public mailbox domains cannot be used for SSO'),
  metadataUrl: httpsUrl.optional().nullable().or(z.literal('')),
  ssoUrl: httpsUrl.optional().or(z.literal('')),
  entityId: z.string().trim().max(2048).optional().or(z.literal('')),
  certificate: z.string().max(64_000).optional().or(z.literal('')),
  autoProvision: z.boolean().optional(),
  defaultRole: z.string().max(64).optional().nullable(),
})

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const config = await prisma.orgSsoConfig.findUnique({
    where: { organisationId: orgId },
  })

  return NextResponse.json(config ?? null)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  const { emailDomain, metadataUrl, ssoUrl, entityId, certificate, autoProvision, defaultRole } =
    parsed.data

  // defaultRole drives auto-provisioning in the SAML callback. Reject any
  // value that isn't a leaf role — otherwise an org admin could provision
  // SUPER_ADMIN / ORG_ADMIN / CHARITY_EMPLOYEE accounts at any IdP-asserted
  // email in their domain. null/undefined are fine (callback falls back
  // to LEARNER).
  if (defaultRole !== null && defaultRole !== undefined && defaultRole !== '') {
    if (!LEAF_ROLES.includes(defaultRole as typeof LEAF_ROLES[number])) {
      return NextResponse.json(
        { error: 'defaultRole must be LEARNER' },
        { status: 400 },
      )
    }
  }

  const configured = Boolean(ssoUrl && entityId && certificate)

  const config = await prisma.orgSsoConfig.upsert({
    where: { organisationId: orgId },
    create: {
      organisationId: orgId,
      emailDomain,
      metadataUrl: metadataUrl ?? null,
      ssoUrl: ssoUrl ?? '',
      entityId: entityId ?? '',
      certificate: certificate ?? '',
      autoProvision: autoProvision ?? false,
      defaultRole: defaultRole ?? null,
      configured,
    },
    update: {
      emailDomain,
      metadataUrl: metadataUrl ?? null,
      ssoUrl: ssoUrl ?? '',
      entityId: entityId ?? '',
      certificate: certificate ?? '',
      autoProvision: autoProvision ?? false,
      defaultRole: defaultRole ?? null,
      configured,
    },
  })

  return NextResponse.json(config)
}

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  try {
    await prisma.orgSsoConfig.delete({
      where: { organisationId: orgId },
    })
  } catch {
    // Config may not exist — that's fine
  }

  return NextResponse.json({ success: true })
}
