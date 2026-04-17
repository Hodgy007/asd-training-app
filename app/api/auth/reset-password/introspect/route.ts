import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { introspectLimiter, getClientIp } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rate = introspectLimiter.check(ip)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const row = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!row || row.expires < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { email: row.email },
    select: { email: true, name: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  return NextResponse.json({
    purpose: row.purpose,
    userEmail: user.email,
    userName: user.name,
  })
}
