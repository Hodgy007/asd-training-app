import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toolkitLeadLimiter, getClientIp } from '@/lib/rate-limit'
import { recordToolkitDocumentEvent } from '@/lib/toolkit'
import { buildToolkitSessionCookie } from '@/lib/toolkit-session'
import { validatePassword } from '@/lib/password-validation'
import {
  TOOLKIT_FORM_ROLES,
  PUBLIC_TOOLKIT_ORG_SLUG,
  getPublicToolkitOrgId,
  mapFormRoleToPlatformRole,
} from '@/lib/toolkit-registration'

const trimmed = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(max))

const trimmedOptional = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max))
    .optional()

const baseSchema = z.object({
  documentId: z.string().min(1),
  name: trimmed(120),
  email: trimmed(254).pipe(z.string().email()),
  formRole: z.enum(TOOLKIT_FORM_ROLES),
  organisation: trimmedOptional(160),
  postcode: trimmedOptional(20),
  marketingConsent: z.boolean().optional(),
  register: z.boolean().optional(),
  password: z.string().min(10).max(200).optional(),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await toolkitLeadLimiter.check(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = baseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 })
  }
  const data = parsed.data
  const email = data.email.toLowerCase()

  // Verify the document is on a published toolkit collection (also rules
  // out attempts to use this public route to download a private document).
  const document = await prisma.libraryDocument.findFirst({
    where: {
      id: data.documentId,
      active: true,
      collection: { active: true, publishedToToolkit: true },
    },
    select: { id: true },
  })
  if (!document) {
    return NextResponse.json({ error: 'That resource is not available.' }, { status: 404 })
  }

  // If a logged-in user is already on the platform, just route them through
  // the standard event-recording path — no lead-capture needed.
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    await recordToolkitDocumentEvent(prisma, {
      documentId: data.documentId,
      action: 'download',
      user: { id: session.user.id, organisationId: session.user.organisationId ?? null },
    })
    return NextResponse.json({
      ok: true,
      fileUrl: `/api/toolkit/documents/${data.documentId}/file`,
      registered: true,
    })
  }

  const registerRequested = data.register === true
  if (registerRequested) {
    if (!data.password) {
      return NextResponse.json({ error: 'A password is required to create an account.' }, { status: 400 })
    }
    const strength = validatePassword(data.password)
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 })
    }
  }

  // Email-collision check. This is a PUBLIC, unauthenticated endpoint — it must
  // never write to an existing account. If a User already exists for this
  // email (in ANY org, including the Public Toolkit org and org-less charity
  // admins / individual subscribers) we refuse to register: setting a password
  // here with no proof of ownership would be account takeover, and demoting
  // their role to LEARNER would lock admins out. They must sign in or use the
  // password-reset flow instead. The generic message doesn't reveal the org.
  const publicOrgId = await getPublicToolkitOrgId()
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organisationId: true, password: true },
  })
  if (existingUser && existingUser.organisationId && existingUser.organisationId !== publicOrgId) {
    return NextResponse.json(
      {
        error: 'This email is already registered. Please sign in at /login or use a different email.',
        code: 'email_in_use',
      },
      { status: 409 },
    )
  }
  if (registerRequested && existingUser) {
    return NextResponse.json(
      {
        error: 'This email is already registered. Please sign in at /login or reset your password.',
        code: 'email_in_use',
      },
      { status: 409 },
    )
  }

  // Upsert the registrant by email. Existing rows get fields merged + lastSeen.
  const existingRegistrant = await prisma.toolkitRegistrant.findUnique({
    where: { email },
    select: { id: true, userId: true },
  })

  let registrantId: string
  let createdUserId: string | null = existingRegistrant?.userId ?? null

  if (existingRegistrant) {
    await prisma.toolkitRegistrant.update({
      where: { id: existingRegistrant.id },
      data: {
        name: data.name,
        formRole: data.formRole,
        organisation: data.organisation ?? null,
        postcode: data.postcode ?? null,
        marketingConsent: data.marketingConsent ?? false,
        lastSeenAt: new Date(),
      },
    })
    registrantId = existingRegistrant.id
  } else {
    const created = await prisma.toolkitRegistrant.create({
      data: {
        name: data.name,
        email,
        formRole: data.formRole,
        organisation: data.organisation ?? null,
        postcode: data.postcode ?? null,
        marketingConsent: data.marketingConsent ?? false,
      },
    })
    registrantId = created.id
  }

  if (registerRequested && !createdUserId) {
    if (!publicOrgId) {
      console.error(`[toolkit/leads] Public Toolkit Users org missing — run seed-public-toolkit-org.ts (slug=${PUBLIC_TOOLKIT_ORG_SLUG})`)
      return NextResponse.json(
        { error: 'Account creation is temporarily unavailable. Your download will continue.' },
        { status: 503 },
      )
    }
    // We only reach here when no User row exists for this email — the
    // register+existingUser case returned 409 above. Never update an
    // existing account from this public endpoint.
    const platformRole = mapFormRoleToPlatformRole(data.formRole)
    const passwordHash = await bcrypt.hash(data.password as string, 12)
    const newUser = await prisma.user.create({
      data: {
        email,
        name: data.name,
        password: passwordHash,
        role: platformRole,
        organisationId: publicOrgId,
        active: true,
        mustChangePassword: false,
        pendingApproval: false,
      },
    })
    createdUserId = newUser.id
    await prisma.toolkitRegistrant.update({
      where: { id: registrantId },
      data: { userId: createdUserId },
    })
  }

  // Record the download event against the registrant.
  await recordToolkitDocumentEvent(prisma, {
    documentId: data.documentId,
    action: 'download',
    registrantId,
  })

  const res = NextResponse.json({
    ok: true,
    fileUrl: `/api/toolkit/documents/${data.documentId}/file`,
    registered: !!createdUserId,
  })
  res.headers.append('Set-Cookie', buildToolkitSessionCookie(registrantId))
  return res
}
