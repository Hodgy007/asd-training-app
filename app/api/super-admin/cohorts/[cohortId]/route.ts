import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  allowedProgramIds: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

async function getCohort(cohortId: string) {
  return prisma.organisation.findFirst({
    where: { id: cohortId, orgType: 'COHORT' },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await prisma.organisation.findFirst({
    where: { id: params.cohortId, orgType: 'COHORT' },
    include: {
      _count: { select: { users: true } },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          mustChangePassword: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(cohort)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await getCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.organisation.update({
    where: { id: params.cohortId },
    data: parsed.data,
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await getCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.organisation.update({
    where: { id: params.cohortId },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}
