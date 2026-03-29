import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
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
    await resend.emails.send({
      from: 'Ambitious About Autism <no-reply@ambitiousaboutautism.org.uk>',
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #f5821f;">Password Reset</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>You requested a password reset for your Ambitious About Autism account.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#f5821f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Reset my password
            </a>
          </p>
          <p style="color:#6b7280;font-size:14px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;">Ambitious About Autism — Not a diagnostic tool</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
  }

  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
}
