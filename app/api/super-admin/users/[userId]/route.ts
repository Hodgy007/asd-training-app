import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['SUPER_ADMIN', 'CHARITY_EMPLOYEE']).optional(),
  charityPermissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = params

  // Verify the target user exists and is a charity-level user
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  if (!targetUser || !['SUPER_ADMIN', 'CHARITY_EMPLOYEE'].includes(targetUser.role)) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Cannot deactivate yourself
  if (parsed.data.active === false && userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 })
  }

  // Validate permissions
  if (parsed.data.charityPermissions) {
    const invalidPerms = parsed.data.charityPermissions.filter(
      (p) => !ALL_CHARITY_PERMISSIONS.includes(p as any)
    )
    if (invalidPerms.length > 0) {
      return NextResponse.json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` }, { status: 400 })
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {}

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active

  if (parsed.data.role !== undefined) {
    updateData.role = parsed.data.role
    // If promoting to SUPER_ADMIN, clear permissions (they have implicit full access)
    if (parsed.data.role === 'SUPER_ADMIN') {
      updateData.charityPermissions = []
    }
  }

  if (parsed.data.charityPermissions !== undefined) {
    // Only set permissions if the resulting role is CHARITY_EMPLOYEE
    const resultingRole = (parsed.data.role ?? targetUser.role) as string
    if (resultingRole === 'CHARITY_EMPLOYEE') {
      updateData.charityPermissions = parsed.data.charityPermissions
    }
  }

  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 12)
    updateData.mustChangePassword = true
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      charityPermissions: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}
