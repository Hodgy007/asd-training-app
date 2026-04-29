import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const surveys = await prisma.survey.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { closesAt: null },
        { closesAt: { gt: new Date() } },
      ],
    },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      closesAt: true,
      _count: { select: { questions: true } },
    },
  })

  return NextResponse.json(surveys)
}
