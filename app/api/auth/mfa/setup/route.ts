import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { TOTP } from 'otpauth'
import QRCode from 'qrcode'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate new TOTP secret
  const totp = new TOTP({
    issuer: 'Ambitious about Autism',
    label: session.user.email || 'Admin',
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.totpSecret) {
    return NextResponse.json({ error: 'MFA not set up. Call GET first.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  })

  return NextResponse.json({ success: true })
}
