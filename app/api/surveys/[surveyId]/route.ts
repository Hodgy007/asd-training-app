import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSurveyForUser } from '@/lib/survey-db'
import type { Role } from '@prisma/client'

export async function GET(
  _req: NextRequest,
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

  return NextResponse.json(survey)
}
