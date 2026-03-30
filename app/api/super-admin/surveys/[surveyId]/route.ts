import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSurveyById } from '@/lib/survey-db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await getSurveyById(params.surveyId)
  if (!survey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(survey)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.surveyId } })
  if (!survey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (survey.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT surveys can be edited' }, { status: 400 })
  }

  const body = await req.json()
  const { title, description, closesAt, questions, targets } = body as {
    title?: string
    description?: string
    closesAt?: string | null
    questions?: Array<{
      type: string
      question: string
      options?: string[]
      required?: boolean
      order: number
    }>
    targets?: Array<{
      role?: string
      organisationId?: string
    }>
  }

  const scalarData: Record<string, unknown> = {}
  if (title !== undefined) scalarData.title = title.trim()
  if (description !== undefined) scalarData.description = description
  if (closesAt !== undefined) scalarData.closesAt = closesAt ? new Date(closesAt) : null

  if (questions !== undefined || targets !== undefined) {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(scalarData).length > 0) {
        await tx.survey.update({ where: { id: params.surveyId }, data: scalarData })
      }

      if (questions !== undefined) {
        await tx.surveyQuestion.deleteMany({ where: { surveyId: params.surveyId } })
        await tx.surveyQuestion.createMany({
          data: questions.map((q) => ({
            surveyId: params.surveyId,
            type: q.type as import('@prisma/client').QuestionType,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            required: q.required ?? true,
            order: q.order,
          })),
        })
      }

      if (targets !== undefined) {
        await tx.surveyTarget.deleteMany({ where: { surveyId: params.surveyId } })
        await tx.surveyTarget.createMany({
          data: targets.map((t) => ({
            surveyId: params.surveyId,
            role: (t.role as import('@prisma/client').Role) ?? null,
            organisationId: t.organisationId ?? null,
          })),
        })
      }
    })
  } else if (Object.keys(scalarData).length > 0) {
    await prisma.survey.update({ where: { id: params.surveyId }, data: scalarData })
  }

  const updated = await getSurveyById(params.surveyId)
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.surveyId } })
  if (!survey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.survey.delete({ where: { id: params.surveyId } })
  return NextResponse.json({ success: true })
}
