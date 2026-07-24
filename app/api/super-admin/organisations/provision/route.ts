import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS, ORG_TYPES } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { Resend } from 'resend'
import { inviteLimiter } from '@/lib/rate-limit'
import { hashResetToken } from '@/lib/reset-token'
import { renderPasswordInviteEmail } from '@/lib/email-templates/invite'

const FROM = 'Ambitious About Autism <onboarding@resend.dev>'
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Provision a school or company in one step: create the organisation, assign
 * its training programmes, create its admin account, and email that admin an
 * activation link. They then invite their own learners.
 *
 * Replaces the bare org-row creation on POST /api/super-admin/organisations,
 * which left every follow-up step to be done by hand.
 *
 * ORG_TYPES deliberately excludes CHARITY — there is exactly one charity org,
 * seeded by scripts/migrate-to-four-roles.ts, and it must not be creatable here.
 */
const provisionSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  organisationType: z.enum(ORG_TYPES),
  allowedProgramIds: z.array(z.string()).default([]),
  isParentOrg: z.boolean().default(false),

  adminName: z.string().min(1).max(200),
  adminEmail: z.string().email().max(200),

  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rate = await inviteLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many organisations provisioned. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    )
  }

  const parsed = provisionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data
  const adminEmail = data.adminEmail.trim().toLowerCase()

  // Check both collisions up front so the admin gets one clear error rather
  // than creating the org and then failing on the user.
  const [slugTaken, emailTaken] = await Promise.all([
    prisma.organisation.findUnique({ where: { slug: data.slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }),
  ])
  if (slugTaken) {
    return NextResponse.json({ error: 'An organisation with that slug already exists.' }, { status: 409 })
  }
  if (emailTaken) {
    return NextResponse.json(
      { error: 'A user with that email address already exists.' },
      { status: 409 }
    )
  }

  // Verify the requested programmes exist before assigning them, so a typo
  // doesn't silently produce an org whose learners see nothing.
  if (data.allowedProgramIds.length > 0) {
    const found = await prisma.trainingProgram.count({
      where: { id: { in: data.allowedProgramIds } },
    })
    if (found !== data.allowedProgramIds.length) {
      return NextResponse.json({ error: 'One or more training programmes were not found.' }, { status: 400 })
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex')

  // Org, admin and activation token are created together — a half-provisioned
  // organisation with no way in would have to be cleaned up by hand.
  const { org, admin } = await prisma.$transaction(async (tx) => {
    const org = await tx.organisation.create({
      data: {
        name: data.name,
        slug: data.slug,
        organisationType: data.organisationType,
        orgType: 'ORGANISATION',
        allowedProgramIds: data.allowedProgramIds,
        allowedRoles: ['LEARNER'],
        isParentOrg: data.isParentOrg,
        active: true,
        pendingApproval: false,
        contactName: data.contactName || null,
        contactEmail: adminEmail,
        contactPhone: data.contactPhone || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        county: data.county || null,
        postcode: data.postcode || null,
        ...(data.country ? { country: data.country } : {}),
      },
    })

    const admin = await tx.user.create({
      data: {
        name: data.adminName,
        email: adminEmail,
        // No password: they set one via the activation link. Nothing is
        // emailed in plain text and there is no temporary password to leak.
        password: null,
        role: 'ORG_ADMIN',
        organisationId: org.id,
        active: true,
        mustChangePassword: false,
        invitedAt: new Date(),
        invitedBy: session.user.id,
      },
      select: { id: true, name: true, email: true },
    })

    await tx.passwordResetToken.create({
      data: {
        email: adminEmail,
        token: hashResetToken(rawToken),
        purpose: 'ACTIVATION',
        expires: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    })

    return { org, admin }
  })

  // Email is sent outside the transaction: a send failure must not roll back a
  // correctly provisioned org. The caller is told so it can prompt a resend
  // through the existing invite endpoint.
  let emailSent = false
  let emailError: string | undefined

  if (!process.env.RESEND_API_KEY) {
    emailError = 'Email service is not configured, so no invite was sent.'
  } else {
    try {
      const { subject, html, text } = renderPasswordInviteEmail({
        name: admin.name,
        activationUrl: `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`,
      })
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: FROM,
        to: admin.email,
        subject,
        html,
        text,
      })
      emailSent = true
    } catch (err) {
      console.error('Provisioning invite email failed:', err)
      emailError = 'The organisation was created but the invite email could not be sent.'
    }
  }

  return NextResponse.json({ org, admin, emailSent, emailError }, { status: 201 })
}
