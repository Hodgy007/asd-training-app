import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loginLimiter, getClientIp } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export { handler as GET }

export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  // Only rate-limit the credentials sign-in callback, not other NextAuth POST routes
  const segments = (await ctx.params).nextauth
  const isCredentialsSignIn =
    segments?.[0] === 'callback' && segments?.[1] === 'credentials'

  if (isCredentialsSignIn) {
    const ip = getClientIp(req)
    const result = await loginLimiter.check(ip)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) } }
      )
    }
  }

  // next-auth >= 4.24.10 awaits ctx.params itself, so pass it through untouched.
  return handler(req, ctx)
}
