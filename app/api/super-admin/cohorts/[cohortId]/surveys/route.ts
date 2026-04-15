import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  surveyIds: z.array(z.string()),
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

  const surveys = await prisma.survey.findMany({
    where: { status: { in: ['DRAFT', 'PUBLISHED'] } },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      closesAt: true,
      _count: { select: { questions: true } },
      targets: {
        where: { organisationId: params.cohortId, role: null },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = surveys.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    closesAt: s.closesAt,
    questionCount: s._count.questions,
    assigned: s.targets.length > 0,
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

  const desiredIds = new Set(parsed.data.surveyIds)

  // Current whole-cohort SurveyTargets for this cohort (role: null)
  const existingTargets = await prisma.surveyTarget.findMany({
    where: { organisationId: params.cohortId, role: null },
    select: { id: true, surveyId: true },
  })
  const existingSurveyIds = new Set(existingTargets.map((t) => t.surveyId))

  const toCreate = parsed.data.surveyIds.filter((id) => !existingSurveyIds.has(id))
  const toDelete = existingTargets.filter((t) => !desiredIds.has(t.surveyId)).map((t) => t.id)

  // Verify surveys-to-create actually exist and are DRAFT/PUBLISHED
  if (toCreate.length > 0) {
    const valid = await prisma.survey.findMany({
      where: {
        id: { in: toCreate },
        status: { in: ['DRAFT', 'PUBLISHED'] },
      },
      select: { id: true },
    })
    const validIds = new Set(valid.map((s) => s.id))
    for (const id of toCreate) {
      if (!validIds.has(id)) {
        return NextResponse.json({ error: `Survey not found or not assignable: ${id}` }, { status: 400 })
      }
    }
  }

  await prisma.$transaction([
    ...(toDelete.length > 0
      ? [prisma.surveyTarget.deleteMany({ where: { id: { in: toDelete } } })]
      : []),
    ...toCreate.map((surveyId) =>
      prisma.surveyTarget.create({
        data: { surveyId, organisationId: params.cohortId, role: null },
      })
    ),
  ])

  return NextResponse.json({
    success: true,
    added: toCreate.length,
    removed: toDelete.length,
  })
}
