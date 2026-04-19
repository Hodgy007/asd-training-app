import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageStudents, CDO_MANAGED_ROLES } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const MANAGED_ROLES: string[] = CDO_MANAGED_ROLES as string[]

const updateSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['STUDENT', 'INTERN', 'EMPLOYEE']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canManageStudents(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== orgId || !MANAGED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (parsed.data.role) {
    const org = await prisma.organisation.findUnique({
      where: { id: orgId },
      select: { allowedRoles: true },
    })
    if (!org || !org.allowedRoles.includes(parsed.data.role)) {
      return NextResponse.json({ error: 'Role not permitted for this organisation' }, { status: 400 })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canManageStudents(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== orgId || !MANAGED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.user.update({ where: { id: params.userId }, data: { active: false } })
  return NextResponse.json({ success: true })
}
