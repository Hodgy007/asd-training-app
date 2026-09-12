import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { TOTP } from 'otpauth'

/**
 * Disable TOTP. Requires a valid current code so a hijacked-but-unverified
 * session (or a stolen cookie) can't strip the second factor. Refused while
 * `mfaPending` is set for the same reason as setup/start.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.mfaPending) {
    return NextResponse.json({ error: 'Complete two-factor verification first.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.totpSecret || !user.totpEnabled) {
    return NextResponse.json({ error: 'MFA not enabled' }, { status: 400 })
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
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  })

  return NextResponse.json({ success: true })
}
