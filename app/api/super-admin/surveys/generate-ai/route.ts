import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { generateSurveyFromTopic } from '@/lib/survey-ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
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
    console.error('AI survey generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate survey. Please try again.' },
      { status: 500 }
    )
  }
}
