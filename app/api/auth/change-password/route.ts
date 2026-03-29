import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // If not a forced change (mustChangePassword), require current password
  if (!user.mustChangePassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 })
    }
    if (!user.password) {
      return NextResponse.json({ error: 'SSO accounts cannot change password here.' }, { status: 400 })
    }
    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
    }
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  })

  return NextResponse.json({ success: true })
}
