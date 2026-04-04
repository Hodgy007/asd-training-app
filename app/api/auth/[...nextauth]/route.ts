import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loginLimiter, getClientIp } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export { handler as GET }

export async function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  // Only rate-limit the credentials sign-in callback, not other NextAuth POST routes
  const segments = ctx.params.nextauth
  const isCredentialsSignIn =
    segments?.[0] === 'callback' && segments?.[1] === 'credentials'

  if (isCredentialsSignIn) {
    const ip = getClientIp(req)
    const result = loginLimiter.check(ip)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) } }
      )
    }
  }

  return handler(req, ctx)
}
