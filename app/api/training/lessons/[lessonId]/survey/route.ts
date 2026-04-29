import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCharityLevel } from '@/lib/rbac'
import { submitSurveyResponse } from '@/lib/survey-db'
import { LessonType } from '@prisma/client'

function isAnswered(value: string | undefined): boolean {
  if (value === undefined) return false
  if (value.trim() === '') return false
  if (value.trim() === '[]') return false
  return true
}

export async function POST(
  req: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: params.lessonId,
      active: true,
      type: LessonType.SURVEY,
      module: { active: true },
    },
    include: {
      module: { select: { id: true, programId: true } },
      survey: { include: { questions: { orderBy: { order: 'asc' } } } },
    },
  })

  if (!lesson || !lesson.surveyId || !lesson.survey) {
    return NextResponse.json({ error: 'Survey lesson not found' }, { status: 404 })
  }

  const hasProgramAccess =
    isCharityLevel(session) ||
    (session.user.effectivePrograms ?? []).some((program) => program.id === lesson.module.programId)

  if (!hasProgramAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = lesson.survey
  if (survey.status !== 'PUBLISHED' || (survey.closesAt && survey.closesAt <= new Date())) {
    return NextResponse.json({ error: 'This survey is not currently open.' }, { status: 400 })
  }

  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_userId: { surveyId: survey.id, userId: session.user.id } },
    select: { completedAt: true },
  })

  if (existing?.completedAt) {
    const progress = await prisma.trainingProgress.upsert({
      where: {
        userId_moduleId_lessonId: {
          userId: session.user.id,
          moduleId: lesson.moduleId,
          lessonId: lesson.id,
        },
      },
      update: { completed: true, completedAt: new Date() },
      create: {
        userId: session.user.id,
        moduleId: lesson.moduleId,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
    })
    return NextResponse.json({ response: existing, progress }, { status: 200 })
  }

  const body = await req.json()
  const { answers } = body as { answers?: Array<{ questionId: string; value: string }> }

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  const questionIds = new Set(survey.questions.map((q) => q.id))
  const normalisedAnswers = answers
    .filter((answer) => questionIds.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      value: String(answer.value ?? ''),
    }))

  const answerMap = new Map(normalisedAnswers.map((answer) => [answer.questionId, answer.value]))
  const missing = survey.questions
    .filter((question) => question.required)
    .filter((question) => !isAnswered(answerMap.get(question.id)))

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required answers for ${missing.length} question(s)` },
      { status: 400 }
    )
  }

  try {
    const response = await submitSurveyResponse(survey.id, session.user.id, normalisedAnswers)
    const progress = await prisma.trainingProgress.upsert({
      where: {
        userId_moduleId_lessonId: {
          userId: session.user.id,
          moduleId: lesson.moduleId,
          lessonId: lesson.id,
        },
      },
      update: { completed: true, completedAt: new Date() },
      create: {
        userId: session.user.id,
        moduleId: lesson.moduleId,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ response, progress }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Survey already completed') {
      return NextResponse.json({ error: 'Survey already completed' }, { status: 409 })
    }
    console.error('Survey lesson submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
