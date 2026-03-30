import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { parseFiles } from '@/lib/file-parser'
import { generateSurveyFromFiles } from '@/lib/survey-ai'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one file is required' }, { status: 400 })
  }

  try {
    const parsed = await parseFiles(files)
    const survey = await generateSurveyFromFiles(parsed)
    return NextResponse.json(survey)
  } catch (error) {
    console.error('AI survey generation from files failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate survey from files. Please try again.' },
      { status: 500 }
    )
  }
}
