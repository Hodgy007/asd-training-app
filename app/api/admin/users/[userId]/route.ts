import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  role: z.string().optional(),
  active: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  allowedModuleIds: z.array(z.string()).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      allowedModuleIds: true, organisationId: true, createdAt: true, updatedAt: true,
      _count: { select: { children: true, trainingProgress: true } },
    },
  })

  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot modify your own account.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (parsed.data.role) {
    const org = await prisma.organisation.findUnique({
      where: { id: session.user.organisationId! },
      select: { allowedRoles: true },
    })
    if (!org || !org.allowedRoles.includes(parsed.data.role)) {
      return NextResponse.json({ error: 'Role not permitted for this organisation' }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: parsed.data as any,
    select: {
      id: true, name: true, email: true, role: true, active: true,
      allowedModuleIds: true, updatedAt: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.user.delete({ where: { id: params.userId } })
  return NextResponse.json({ success: true })
}
