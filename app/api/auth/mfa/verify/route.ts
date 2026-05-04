import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { TOTP } from 'otpauth'
import { mfaVerifyLimiter, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined
  const ip = getClientIp(req)
  const rateLimit = await mfaVerifyLimiter.check(ip)
  if (!rateLimit.success) {
    logger.warn('auth.mfa_verify.rate_limited', { requestId, ip })
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    )
  }

  const { userId, code } = await req.json()
  if (!userId || !code) {
    logger.warn('auth.mfa_verify.invalid_input', { requestId, ip })
    return NextResponse.json({ error: 'userId and code are required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.totpSecret || !user.totpEnabled) {
    logger.warn('auth.mfa_verify.not_enrolled', { requestId, ip, userId })
    return NextResponse.json({ error: 'MFA not enabled for this user' }, { status: 400 })
  }

  const totp = new TOTP({
    issuer: 'Ambitious about Autism',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.totpSecret,
  })

  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) {
    logger.warn('auth.mfa_verify.invalid_code', { requestId, userId })
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  logger.info('auth.mfa_verify.success', { requestId, userId, delta })
  return NextResponse.json({ success: true })
}
