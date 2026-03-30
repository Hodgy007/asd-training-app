import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSurveyResults, getSurveyInsights } from '@/lib/survey-db'
import {
  buildResultsData,
  generateSurveySummary,
  generateSurveyComparative,
  generateSurveyRecommendations,
} from '@/lib/survey-ai'

export const maxDuration = 120

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const insights = await getSurveyInsights(params.surveyId)
  return NextResponse.json(insights)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await getSurveyResults(params.surveyId)
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  if (survey.responses.length === 0) {
    return NextResponse.json({ error: 'No responses yet — insights cannot be generated' }, { status: 400 })
  }

  const data = buildResultsData(survey)

  const [summary, comparative, recommendations] = await Promise.all([
    generateSurveySummary(data),
    generateSurveyComparative(data),
    generateSurveyRecommendations(data),
  ])

  const insights = await prisma.$transaction([
    prisma.surveyInsight.upsert({
      where: { surveyId_type: { surveyId: params.surveyId, type: 'SUMMARY' } },
      create: { surveyId: params.surveyId, type: 'SUMMARY', content: summary, generatedAt: new Date() },
      update: { content: summary, generatedAt: new Date() },
    }),
    prisma.surveyInsight.upsert({
      where: { surveyId_type: { surveyId: params.surveyId, type: 'COMPARATIVE' } },
      create: { surveyId: params.surveyId, type: 'COMPARATIVE', content: comparative, generatedAt: new Date() },
      update: { content: comparative, generatedAt: new Date() },
    }),
    prisma.surveyInsight.upsert({
      where: { surveyId_type: { surveyId: params.surveyId, type: 'RECOMMENDATIONS' } },
      create: { surveyId: params.surveyId, type: 'RECOMMENDATIONS', content: recommendations, generatedAt: new Date() },
      update: { content: recommendations, generatedAt: new Date() },
    }),
  ])

  return NextResponse.json(insights)
}
