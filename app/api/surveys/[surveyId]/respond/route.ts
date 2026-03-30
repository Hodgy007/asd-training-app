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

  const body = await req.json()
  const { answers } = body as { answers: Array<{ questionId: string; value: string }> }

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  const requiredQuestionIds = survey.questions
    .filter((q) => q.required)
    .map((q) => q.id)

  const answeredIds = new Set(answers.map((a) => a.questionId))
  const missing = requiredQuestionIds.filter((id) => !answeredIds.has(id))

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
