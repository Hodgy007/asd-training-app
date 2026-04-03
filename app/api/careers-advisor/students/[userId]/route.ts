import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasRole } from '@/lib/rbac'
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

  // Verify student belongs to same org
  const student = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true, role: true, organisationId: true },
  })

  if (!student || student.organisationId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sessions = await prisma.careerAdvisorSession.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ student, sessions })
}
