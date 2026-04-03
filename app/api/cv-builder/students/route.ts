import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

    const students = await prisma.user.findMany({
      where: {
        organisationId: cdo.organisationId,
        role: { in: ['STUDENT', 'INTERN', 'EMPLOYEE'] },
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: { cvs: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('GET /api/cv-builder/students error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
