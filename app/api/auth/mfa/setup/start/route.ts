import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { TOTP } from 'otpauth'
import QRCode from 'qrcode'

/**
 * Begin TOTP enrolment: generate a fresh secret, store it on the user (not
 * yet enabled) and return the QR code + base32 secret for the authenticator
 * app. The user then confirms a code via POST /api/auth/mfa/setup.
 *
 * Security notes:
 *   - POST, not GET. Generating a secret is a state change; as a GET it could
 *     be triggered by a cross-site top-level navigation (cookies are
 *     SameSite=Lax) and would silently rotate a signed-in admin's secret.
 *   - Refused while `mfaPending` is set. A session that has presented only a
 *     password must never be able to replace the authenticator it is being
 *     asked for — that was a complete MFA bypass.
 *   - Refused when TOTP is already enabled. Rotation goes through
 *     POST /api/auth/mfa/disable (which requires a valid current code) and
 *     then re-enrolment, so there is never a half-rotated secret.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.mfaPending) {
    return NextResponse.json({ error: 'Complete two-factor verification first.' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabled: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.totpEnabled) {
    return NextResponse.json(
      {
        error:
          'Two-factor authentication is already enabled. Disable it with a current code before enrolling a new device.',
      },
      { status: 409 },
    )
  }

  const totp = new TOTP({
    issuer: 'Ambitious about Autism',
    label: user.email || 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  // Store secret temporarily (not enabled yet until verified)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: totp.secret.base32 },
  })

  const uri = totp.toString()
  const qrCodeDataUrl = await QRCode.toDataURL(uri)

  return NextResponse.json({ qrCode: qrCodeDataUrl, secret: totp.secret.base32 })
}
