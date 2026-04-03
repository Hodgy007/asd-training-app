import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!hasRole(session, 'CAREER_DEV_OFFICER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 })
  }

  const students = await prisma.user.findMany({
    where: {
      organisationId: orgId,
      role: { in: ['STUDENT', 'INTERN', 'EMPLOYEE'] },
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { careerAdvisorSessions: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(students)
}
