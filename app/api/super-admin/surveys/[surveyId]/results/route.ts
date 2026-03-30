import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { getSurveyResults, getTargetedUserCount } from '@/lib/survey-db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await getSurveyResults(params.surveyId)
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  const [targetedCount] = await Promise.all([
    getTargetedUserCount(params.surveyId),
  ])

  const responseCount = survey.responses.length
  const responseRate = targetedCount > 0
    ? Math.round((responseCount / targetedCount) * 100)
    : 0

  return NextResponse.json({ survey, targetedCount, responseCount, responseRate })
}
