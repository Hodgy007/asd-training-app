import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREER_DEV_OFFICER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const cdo = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organisationId: true },
    })

    if (!cdo?.organisationId) {
      return NextResponse.json({ error: 'No organisation assigned' }, { status: 400 })
    }

    // Verify the target user is in the same org and has a student-type role
    const student = await prisma.user.findFirst({
      where: {
        id: params.userId,
        organisationId: cdo.organisationId,
        role: { in: ['STUDENT', 'INTERN', 'EMPLOYEE'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const cvs = await prisma.cV.findMany({
      where: { userId: params.userId },
      include: {
        workExperiences: { orderBy: { order: 'asc' } },
        educationEntries: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        references: { orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ student, cvs })
  } catch (error) {
    console.error('GET /api/cv-builder/students/[userId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
