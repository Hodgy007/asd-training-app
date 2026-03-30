import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { listSurveys } from '@/lib/survey-db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const surveys = await listSurveys()
  return NextResponse.json(surveys)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, closesAt, questions, targets } = body as {
    title: string
    description?: string
    closesAt?: string
    questions: Array<{
      type: string
      question: string
      options?: string[]
      required?: boolean
      order: number
    }>
    targets: Array<{
      role?: string
      organisationId?: string
    }>
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: 'questions must be an array' }, { status: 400 })
  }
  if (!Array.isArray(targets)) {
    return NextResponse.json({ error: 'targets must be an array' }, { status: 400 })
  }

  const survey = await prisma.survey.create({
    data: {
      title: title.trim(),
      description: description ?? null,
      closesAt: closesAt ? new Date(closesAt) : null,
      createdById: session.user.id,
      questions: {
        create: questions.map((q) => ({
          type: q.type as import('@prisma/client').QuestionType,
          question: q.question,
          options: q.options ? JSON.stringify(q.options) : null,
          required: q.required ?? true,
          order: q.order,
        })),
      },
      targets: {
        create: targets.map((t) => ({
          role: (t.role as import('@prisma/client').Role) ?? null,
          organisationId: t.organisationId ?? null,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: true,
    },
  })

  return NextResponse.json(survey, { status: 201 })
}
