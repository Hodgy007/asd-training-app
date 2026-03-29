import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { TOTP } from 'otpauth'

export async function POST(req: NextRequest) {
  const { userId, code } = await req.json()
  if (!userId || !code) {
    return NextResponse.json({ error: 'userId and code are required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.totpSecret || !user.totpEnabled) {
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
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
