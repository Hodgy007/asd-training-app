import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  collectionIds: z.array(z.string()),
})

async function requireCohort(cohortId: string) {
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

  const cohort = await requireCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })

  const collections = await prisma.libraryCollection.findMany({
    where: { active: true },
    select: {
      id: true,
      title: true,
      description: true,
      targetOrgIds: true,
      _count: { select: { documents: true } },
    },
    orderBy: { title: 'asc' },
  })

  const result = collections.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    documentCount: c._count.documents,
    assigned: c.targetOrgIds.includes(params.cohortId),
  }))

  return NextResponse.json(result)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await requireCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const desiredIds = new Set(parsed.data.collectionIds)

  // Pull all active collections that are currently targeted at this cohort, or that the user wants to assign
  const candidates = await prisma.libraryCollection.findMany({
    where: {
      active: true,
      OR: [
        { targetOrgIds: { has: params.cohortId } },
        { id: { in: parsed.data.collectionIds } },
      ],
    },
    select: { id: true, targetOrgIds: true },
  })

  const ops = []
  for (const col of candidates) {
    const currentlyAssigned = col.targetOrgIds.includes(params.cohortId)
    const shouldBeAssigned = desiredIds.has(col.id)

    if (currentlyAssigned && !shouldBeAssigned) {
      // Remove cohort from targets
      ops.push(
        prisma.libraryCollection.update({
          where: { id: col.id },
          data: { targetOrgIds: col.targetOrgIds.filter((id) => id !== params.cohortId) },
        })
      )
    } else if (!currentlyAssigned && shouldBeAssigned) {
      // Add cohort to targets
      ops.push(
        prisma.libraryCollection.update({
          where: { id: col.id },
          data: { targetOrgIds: [...col.targetOrgIds, params.cohortId] },
        })
      )
    }
  }

  await prisma.$transaction(ops)

  return NextResponse.json({ success: true, updated: ops.length })
}
