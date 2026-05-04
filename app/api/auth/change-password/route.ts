import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { changePasswordLimiter, getClientIp } from '@/lib/rate-limit'
import { logger, errMeta } from '@/lib/logger'

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1).max(128),
})

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined
  const ip = getClientIp(req)
  const rateLimit = await changePasswordLimiter.check(ip)
  if (!rateLimit.success) {
    logger.warn('auth.change_password.rate_limited', { requestId, ip })
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    logger.warn('auth.change_password.unauthenticated', { requestId, ip })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    logger.warn('auth.change_password.invalid_input', {
      requestId,
      userId: session.user.id,
    })
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  }

  const passwordCheck = validatePassword(parsed.data.newPassword)
  if (!passwordCheck.valid) {
    logger.warn('auth.change_password.weak_password', {
      requestId,
      userId: session.user.id,
    })
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    logger.error('auth.change_password.user_not_found', {
      requestId,
      userId: session.user.id,
    })
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // If not a forced change (mustChangePassword), require current password
  if (!user.mustChangePassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 })
    }
    if (!user.password) {
      logger.warn('auth.change_password.sso_account_blocked', {
        requestId,
        userId: user.id,
      })
      return NextResponse.json({ error: 'SSO accounts cannot change password here.' }, { status: 400 })
    }
    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password)
    if (!isValid) {
      logger.warn('auth.change_password.wrong_current_password', {
        requestId,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
    }
  }

  try {
    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    })

    logger.info('auth.change_password.success', {
      requestId,
      userId: user.id,
      forced: user.mustChangePassword,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('auth.change_password.failed', {
      requestId,
      userId: user.id,
      ...errMeta(error),
    })
    throw error
  }
}
