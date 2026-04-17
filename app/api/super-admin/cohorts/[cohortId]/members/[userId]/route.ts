import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cohortId: string; userId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await prisma.organisation.findFirst({
    where: { id: params.cohortId, orgType: 'COHORT' },
  })
  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== params.cohortId) {
    return NextResponse.json({ error: 'User not found in this cohort' }, { status: 404 })
  }

  // Remove the user from the cohort (keep the user record — they can be
  // reassigned to another org later).
  await prisma.user.update({
    where: { id: params.userId },
    data: { organisationId: null },
  })

  return NextResponse.json({ success: true })
}
