import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { archiveCohort, unarchiveCohort } from '@/lib/cohort'

async function findCohort(cohortId: string) {
  return prisma.organisation.findFirst({ where: { id: cohortId, orgType: 'COHORT' } })
}

export async function POST(_req: NextRequest, { params }: { params: { cohortId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const cohort = await findCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await archiveCohort(params.cohortId)
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { cohortId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const cohort = await findCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await unarchiveCohort(params.cohortId)
  return NextResponse.json(updated)
}
