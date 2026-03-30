import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      _count: { select: { questions: true, targets: true } },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }
  if (survey.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT surveys can be published' }, { status: 400 })
  }
  if (survey._count.questions === 0) {
    return NextResponse.json({ error: 'Survey must have at least one question before publishing' }, { status: 400 })
  }
  if (survey._count.targets === 0) {
    return NextResponse.json({ error: 'Survey must have at least one target before publishing' }, { status: 400 })
  }

  const updated = await prisma.survey.update({
    where: { id: params.surveyId },
    data: { status: 'PUBLISHED' },
  })

  return NextResponse.json(updated)
}
