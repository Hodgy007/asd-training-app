import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSurveyForUser, submitSurveyResponse } from '@/lib/survey-db'
import type { Role } from '@prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const survey = await getSurveyForUser(
    params.surveyId,
    session.user.id,
    session.user.role as Role,
    session.user.organisationId ?? null
  )

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found or already completed' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const rawAnswers = (body as { answers?: unknown })?.answers

  if (!rawAnswers || !Array.isArray(rawAnswers)) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  // Bind every answer to a question that belongs to THIS survey and coerce the
  // value to a length-capped string. Without this, a caller could attach
  // answers referencing another survey's questions (the FK only requires the
  // question to exist somewhere) or store megabytes in a Text column.
  const MAX_ANSWER_LENGTH = 10_000
  const questionIds = new Set(survey.questions.map((q) => q.id))
  const seen = new Set<string>()
  const answers = (rawAnswers as Array<{ questionId?: unknown; value?: unknown }>)
    .filter((a) => a && typeof a.questionId === 'string' && questionIds.has(a.questionId))
    .filter((a) => {
      // De-dupe: one answer per question (last-write would otherwise create
      // duplicate SurveyAnswer rows).
      const id = a.questionId as string
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((a) => ({
      questionId: a.questionId as string,
      value: String(a.value ?? '').slice(0, MAX_ANSWER_LENGTH),
    }))

  const answeredIds = new Set(answers.map((a) => a.questionId))
  const missing = survey.questions
    .filter((q) => q.required)
    .map((q) => q.id)
    .filter((id) => !answeredIds.has(id))

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required answers for ${missing.length} question(s)` },
      { status: 400 }
    )
  }

  try {
    const response = await submitSurveyResponse(params.surveyId, session.user.id, answers)
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Survey already completed') {
      return NextResponse.json({ error: 'Survey already completed' }, { status: 409 })
    }
    throw error
  }
}
