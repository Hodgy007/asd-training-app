import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'
import { inviteLimiter } from '@/lib/rate-limit'
import { renderPasswordInviteEmail, renderSsoInviteEmail } from '@/lib/email-templates/invite'
import { hashResetToken } from '@/lib/reset-token'

const FROM = 'Ambitious About Autism <onboarding@resend.dev>'
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isCharityLevel =
    session.user.role === 'SUPER_ADMIN' || session.user.role === 'CHARITY_EMPLOYEE'
  const isOrgAdmin = session.user.role === 'ORG_ADMIN'
  if (!isCharityLevel && !isOrgAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rate = await inviteLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many invite sends. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      organisation: {
        select: {
          id: true,
          ssoConfig: { select: { emailDomain: true } },
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!user.active) return NextResponse.json({ error: 'User is inactive' }, { status: 400 })

  // ORG_ADMIN can only invite users in their own organisation
  if (isOrgAdmin && user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  const emailDomain = user.email.split('@')[1] ?? ''
  const isSsoUser =
    !user.password &&
    !!user.organisation?.ssoConfig?.emailDomain &&
    user.organisation.ssoConfig.emailDomain.toLowerCase() === emailDomain.toLowerCase()

  try {
    if (isSsoUser) {
      const { subject, html, text } = renderSsoInviteEmail({
        name: user.name,
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
      })
      await resend.emails.send({ from: FROM, to: user.email, subject, html, text })
    } else {
      await prisma.passwordResetToken.deleteMany({ where: { email: user.email } })
      const rawToken = crypto.randomBytes(32).toString('hex')
      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token: hashResetToken(rawToken),
          purpose: 'ACTIVATION',
          expires: new Date(Date.now() + TOKEN_EXPIRY_MS),
        },
      })
      const activationUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`
      const { subject, html, text } = renderPasswordInviteEmail({
        name: user.name,
        activationUrl,
      })
      await resend.emails.send({ from: FROM, to: user.email, subject, html, text })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { invitedAt: new Date(), invitedBy: session.user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Invite email failed:', err)
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 502 })
  }
}
