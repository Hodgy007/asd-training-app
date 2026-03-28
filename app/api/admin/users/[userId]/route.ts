import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/rbac'
import { z } from 'zod'

const updateSchema = z.object({
  role: z.enum(['CAREGIVER', 'CAREER_DEV_OFFICER', 'ADMIN']).optional(),
  active: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { children: true, trainingProgress: true } },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent admin from deactivating themselves
  if (params.userId === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot modify your own account via the admin panel.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent admin from deleting themselves
  if (params.userId === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await prisma.user.delete({ where: { id: params.userId } })

  return NextResponse.json({ success: true })
}
