import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasRole, CDO_MANAGED_ROLES } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!hasRole(session, 'CAREER_DEV_OFFICER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 })
  }

  // Verify student belongs to same org and is one of the leaf roles a CDO
  // is allowed to manage. Without the role filter a CDO could fetch the
  // advisor sessions of any same-org user, including ORG_ADMIN.
  const student = await prisma.user.findFirst({
    where: {
      id: params.userId,
      organisationId: orgId,
      role: { in: CDO_MANAGED_ROLES },
    },
    select: { id: true, name: true, email: true, role: true, organisationId: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sessions = await prisma.careerAdvisorSession.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ student, sessions })
}
