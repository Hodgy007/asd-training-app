import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'
import { z } from 'zod'
import { forgotPasswordLimiter, getClientIp } from '@/lib/rate-limit'
import { wrapEmailHtml } from '@/lib/email-templates/layout'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimit = forgotPasswordLimiter.check(ip)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
  }

  const { email } = parsed.data

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) {
    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
  }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await prisma.passwordResetToken.create({ data: { email, token, expires } })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured — cannot send password reset email')
    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const innerHtml = `
      <h2 style="color: #f5821f; margin-top: 0;">Password Reset</h2>
      <p>Hi ${user.name || 'there'},</p>
      <p>You requested a password reset for your Ambitious About Autism account.</p>
      <p><a class="btn" href="${resetUrl}">Reset my password</a></p>
      <p class="footer">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `
    await resend.emails.send({
      from: 'Ambitious About Autism <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your password',
      html: wrapEmailHtml(innerHtml),
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
  }

  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
}
