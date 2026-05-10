import { NextRequest, NextResponse } from 'next/server'
import { decode, encode } from 'next-auth/jwt'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { registerLimiter, getClientIp } from '@/lib/rate-limit'
import { getPublicToolkitOrgId, mapFormRoleToPlatformRole } from '@/lib/toolkit-registration'
import { getUserPrograms } from '@/lib/modules'

const FORM_ROLE = z.enum(['autistic', 'parent_carer', 'supporter', 'practitioner'])

const postSchema = z.object({
  token: z.string().min(1).max(2000),
  formRole: FORM_ROLE,
  name: z.string().min(1).max(120).optional(),
})

interface IntentClaims {
  purpose?: string
  email?: string
  name?: string | null
  provider?: string
  providerAccountId?: string
}

async function decodeIntent(token: string): Promise<IntentClaims | null> {
  try {
    const decoded = (await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET!,
    })) as IntentClaims | null
    if (!decoded || decoded.purpose !== 'sso-register') return null
    if (!decoded.email || !decoded.provider || !decoded.providerAccountId) return null
    return decoded
  } catch {
    return null
  }
}

/**
 * GET — fetch pre-fill data for the completion page. The page reads the
 * token from the URL and calls this to render email + name. No body, just
 * the token; the JWT signature is the auth.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }
  const claims = await decodeIntent(token)
  if (!claims) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  // Race condition guard: if the user got created in another tab between
  // OAuth landing and this page load, send them back to /login.
  const existing = await prisma.user.findUnique({
    where: { email: claims.email! },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'ACCOUNT_EXISTS' }, { status: 409 })
  }

  return NextResponse.json({
    email: claims.email,
    name: claims.name ?? '',
    provider: claims.provider,
  })
}

/**
 * POST — finish the registration. Creates the User row, links the OAuth
 * Account, and mints a NextAuth session cookie so the user lands signed in.
 *
 * The JWT signature is the only auth — the email + provider link inside it
 * came from the OAuth dance and were stamped by the signIn callback. We
 * re-verify the JWT here, then never trust the body's email/provider —
 * they don't even exist in the schema.
 */
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

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { token, formRole, name: nameFromBody } = parsed.data

  const claims = await decodeIntent(token)
  if (!claims) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  const email = claims.email!.toLowerCase()
  const provider = claims.provider!
  const providerAccountId = claims.providerAccountId!

  // Reject if the user (or the Account link) already exists.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existingUser) {
    return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 })
  }
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { id: true },
  })
  if (existingAccount) {
    return NextResponse.json({ error: 'ACCOUNT_LINK_EXISTS' }, { status: 409 })
  }

  const publicOrgId = await getPublicToolkitOrgId()
  if (!publicOrgId) {
    console.error(
      '[auth/register/sso-complete] Public Toolkit Users org missing — run seed-public-toolkit-org.ts',
    )
    return NextResponse.json({ error: 'CATCHALL_UNAVAILABLE' }, { status: 503 })
  }

  const platformRole = mapFormRoleToPlatformRole(formRole)
  const displayName = (nameFromBody?.trim() || claims.name || email.split('@')[0]).slice(0, 120)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name: displayName,
        password: null, // SSO-only account
        role: platformRole,
        organisationId: publicOrgId,
        active: true,
        pendingApproval: false,
        mustChangePassword: false,
      },
    })
    await tx.account.create({
      data: {
        userId: created.id,
        type: 'oauth',
        provider,
        providerAccountId,
      },
    })
    return created
  })

  // Mint a NextAuth JWT session cookie so the user lands signed in (same
  // pattern as the SAML callback does).
  const effectivePrograms = await getUserPrograms(user.id)
  const sessionToken = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organisationId: user.organisationId,
      mustChangePassword: false,
      totpEnabled: false,
      mfaPending: false,
      hasPassword: false,
      effectivePrograms,
      charityPermissions: [],
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
      isParentOrg: false,
      subscriptionStatus: 'NONE',
      isPersonalOrg: false,
      lastValidatedAt: Date.now(),
    },
    secret: process.env.NEXTAUTH_SECRET!,
  })

  const isProduction = process.env.NODE_ENV === 'production'
  const cookieName = isProduction
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'

  const res = NextResponse.json({ ok: true, redirect: '/' })
  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
  return res
}
