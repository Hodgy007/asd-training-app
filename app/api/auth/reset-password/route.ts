import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { token, password } = parsed.data

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired. Please request a new one.' },
      { status: 400 }
    )
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashed },
  })

  await prisma.passwordResetToken.delete({ where: { token } })

  return NextResponse.json({ message: 'Password updated successfully.' })
}
