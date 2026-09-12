import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['SUPER_ADMIN', 'CHARITY_EMPLOYEE']).optional(),
  charityPermissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  password: z.string().optional(),
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
    const passwordCheck = validatePassword(parsed.data.password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = params

  // You can't delete your own account (matches the self-deactivate block in
  // PATCH and the admin self-delete guard in /api/account).
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  // This endpoint only manages charity-level users. 404 anything else so it
  // can't be used to delete org admins or learners.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
  if (!target || !['SUPER_ADMIN', 'CHARITY_EMPLOYEE'].includes(target.role)) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Never delete the last active Charity Admin — that would lock everyone out
  // of the super-admin surface.
  if (target.role === 'SUPER_ADMIN') {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: 'SUPER_ADMIN', active: true, id: { not: userId } },
    })
    if (otherActiveAdmins === 0) {
      return NextResponse.json(
        { error: 'Cannot delete the last active Charity Admin. Create another admin first.' },
        { status: 400 }
      )
    }
  }

  try {
    await prisma.user.delete({ where: { id: userId } })
  } catch (error) {
    // Several relations (announcements, workshops, surveys, library
    // collections, uploaded documents, brand assets, integration keys, job
    // openings, job assignments-given) are Restrict — deleting a user who
    // authored any of them raises a foreign-key error. Report it clearly and
    // point the admin at deactivation instead of orphaning or silently
    // reassigning their content.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'This account has created content (workshops, announcements, surveys, library items, brand assets, job openings or API keys), so it cannot be deleted. Reassign or remove that content first, or deactivate the account instead.',
        },
        { status: 409 }
      )
    }
    throw error
  }

  return NextResponse.json({ success: true })
}
