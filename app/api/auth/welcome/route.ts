import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { resetPasswordLimiter, getClientIp } from '@/lib/rate-limit'
import { hashResetToken } from '@/lib/reset-token'
import { logger, errMeta } from '@/lib/logger'
import { getUserPrograms } from '@/lib/modules'
import { getEffectiveOrgSettings } from '@/lib/org-hierarchy'

/**
 * Welcome flow endpoint — used by the /welcome page after a user clicks
 * the "Finish setting up your account" link from their welcome email.
 *
 * GET  ?token=…   → return { email, name, organisationName } so the page
 *                   can show who's signing in.
 * POST { token, password } → validate, set the password, mark
 *                   mustChangePassword=false, consume the token, mint a
 *                   NextAuth JWT session cookie, and respond with a redirect.
 *
 * Reuses PasswordResetToken (same SHA-256-hashed-at-rest pattern) so we
 * don't introduce a parallel token system.
 */

const postSchema = z.object({
  token: z.string().min(1).max(256),
  password: z.string().min(1).max(128),
})

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const tokenHash = hashResetToken(token)
  const row = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } })
  if (!row || row.expires < new Date()) {
    return NextResponse.json(
      { error: 'This sign-up link is invalid or has expired. Please register again.' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: row.email },
    select: {
      name: true,
      email: true,
      organisation: { select: { name: true } },
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  return NextResponse.json({
    email: user.email,
    name: user.name ?? '',
    organisationName: user.organisation?.name ?? null,
  })
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined
  const ip = getClientIp(req)
  const rl = await resetPasswordLimiter.check(ip)
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

  const { token, password } = parsed.data

  const strength = validatePassword(password)
  if (!strength.valid) {
    return NextResponse.json({ error: strength.error }, { status: 400 })
  }

  const tokenHash = hashResetToken(token)
  const row = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } })
  if (!row || row.expires < new Date()) {
    return NextResponse.json(
      { error: 'This sign-up link is invalid or has expired. Please register again.' },
      { status: 400 },
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  let user
  try {
    user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { email: row.email },
        data: {
          password: passwordHash,
          mustChangePassword: false,
          active: true,
        },
        include: { organisation: { select: { active: true } } },
      })
      await tx.passwordResetToken.delete({ where: { token: tokenHash } })
      return updated
    })
  } catch (error) {
    logger.error('auth.welcome.failed', { requestId, ip, ...errMeta(error) })
    return NextResponse.json({ error: 'Could not finish sign-up. Please try again.' }, { status: 500 })
  }

  // Mint a session cookie so the user lands signed in (same shape as
  // the SAML and SSO-complete callbacks).
  const effectivePrograms = await getUserPrograms(user.id)
  const orgInfo = user.organisationId
    ? await prisma.organisation.findUnique({
        where: { id: user.organisationId },
        select: { isParentOrg: true, subscriptionStatus: true },
      })
    : null

  const sessionToken = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organisationId: user.organisationId,
      mustChangePassword: false,
      totpEnabled: user.totpEnabled ?? false,
      mfaPending: false,
      hasPassword: true,
      effectivePrograms,
      charityPermissions: user.charityPermissions ?? [],
      isParentOrg: orgInfo?.isParentOrg ?? false,
      subscriptionStatus: orgInfo?.subscriptionStatus ?? 'NONE',
      isPersonalOrg: !user.organisationId,
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
