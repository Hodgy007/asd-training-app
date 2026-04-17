import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { runPrompt } from '@/lib/ai-runner'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { lessonContent, questionCount } = body

  if (!lessonContent || typeof lessonContent !== 'string') {
    return NextResponse.json({ error: 'lessonContent is required' }, { status: 400 })
  }

  // Clamp questionCount to 1–10, default 5
  const count = Math.min(10, Math.max(1, typeof questionCount === 'number' ? questionCount : 5))

  const plainText = stripHtml(lessonContent)

  try {
    const text = await runPrompt('training.quizGenerate', {
      count: String(count),
      plainText,
    })

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const jsonString = jsonMatch ? jsonMatch[0] : text

    let questions: unknown
    try {
      questions = JSON.parse(jsonString)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', raw: text },
        { status: 502 }
      )
    }

    return NextResponse.json({ questions })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('generate-quiz error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
