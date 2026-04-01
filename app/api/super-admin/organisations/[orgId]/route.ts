import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { LEAF_ROLES } from '@/types'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  allowedRoles: z.array(z.string()).refine(
    (roles) => roles.every((r) => LEAF_ROLES.includes(r as any)),
    'Only leaf roles are allowed'
  ).optional(),
  allowedProgramIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().max(200).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: params.orgId },
    include: {
      users: {
        select: {
          id: true, name: true, email: true, role: true, active: true,
          mustChangePassword: true, createdAt: true,
          password: true,
          _count: { select: { trainingProgress: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { users: true } },
    },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Strip password hashes and add ssoOnly flag
  const orgWithSso = {
    ...org,
    users: org.users.map(({ password, ...rest }) => ({ ...rest, ssoOnly: password === '' })),
  }
  return NextResponse.json(orgWithSso)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const org = await prisma.organisation.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (parsed.data.slug && parsed.data.slug !== org.slug) {
    const slugExists = await prisma.organisation.findUnique({ where: { slug: parsed.data.slug } })
    if (slugExists) {
      return NextResponse.json({ error: 'Slug already in use.' }, { status: 409 })
    }
  }

  const updated = await prisma.organisation.update({
    where: { id: params.orgId },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: params.orgId },
    include: { _count: { select: { users: true } } },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (org._count.users > 0) {
    return NextResponse.json(
      { error: 'Cannot delete an organisation that has users. Reassign or delete all users first.' },
      { status: 409 }
    )
  }

  await prisma.organisation.delete({ where: { id: params.orgId } })
  return NextResponse.json({ success: true })
}
