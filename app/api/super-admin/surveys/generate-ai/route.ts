import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { generateSurveyFromTopic } from '@/lib/survey-ai'
import { isAiUnavailable } from '@/lib/ai-runner'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { topic, audience } = body

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
  }

  try {
    const survey = await generateSurveyFromTopic(topic, audience)
    return NextResponse.json(survey)
  } catch (error) {
    if (isAiUnavailable(error)) {
      return NextResponse.json(
        { error: 'AI is temporarily unavailable. Please try again in a moment.', code: 'AI_UNAVAILABLE' },
        { status: 503 }
      )
    }
    console.error('AI survey generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate survey. Please try again.' },
      { status: 500 }
    )
  }
}
