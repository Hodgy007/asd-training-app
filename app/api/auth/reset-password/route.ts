import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { resetPasswordLimiter, getClientIp } from '@/lib/rate-limit'
import { logger, errMeta } from '@/lib/logger'
import { hashResetToken } from '@/lib/reset-token'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(1).max(128),
})

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined
  const ip = getClientIp(req)
  const rateLimit = resetPasswordLimiter.check(ip)
  if (!rateLimit.success) {
    logger.warn('auth.reset_password.rate_limited', { requestId, ip })
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    logger.warn('auth.reset_password.invalid_input', { requestId, ip })
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { token, password } = parsed.data

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) {
    logger.warn('auth.reset_password.weak_password', { requestId, ip })
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
  }

  // Look up by SHA-256 digest of the user-supplied raw token. The DB stores
  // only digests since the plaintext-token leak fix.
  const tokenHash = hashResetToken(token)
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } })

  if (!resetToken || resetToken.expires < new Date()) {
    logger.warn('auth.reset_password.invalid_token', {
      requestId,
      ip,
      reason: !resetToken ? 'token_not_found' : 'token_expired',
    })
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired. Please request a new one.' },
      { status: 400 }
    )
  }

  try {
    const hashed = await bcrypt.hash(password, 12)

    // Update the password and consume the token in one transaction so a
    // partial failure can't leave the new password set with a still-valid
    // reset link, or vice versa.
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { password: hashed, mustChangePassword: false },
      }),
      prisma.passwordResetToken.delete({ where: { token: tokenHash } }),
    ])

    logger.info('auth.reset_password.success', { requestId, ip })
    return NextResponse.json({ message: 'Password updated successfully.' })
  } catch (error) {
    logger.error('auth.reset_password.failed', {
      requestId,
      ip,
      ...errMeta(error),
    })
    throw error
  }
}
