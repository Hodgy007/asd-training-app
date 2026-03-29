import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'

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

function extractJson(text: string): string {
  // Strip ```json ... ``` or ``` ... ``` code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  return text.trim()
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { lessonContent, questionCount } = body

  if (!lessonContent || typeof lessonContent !== 'string') {
    return NextResponse.json({ error: 'lessonContent is required' }, { status: 400 })
  }

  // Clamp questionCount to 1–10, default 5
  const count = Math.min(10, Math.max(1, typeof questionCount === 'number' ? questionCount : 5))

  const plainText = stripHtml(lessonContent)

  const prompt = `You are a training quiz generator. Based on the following lesson content, generate ${count} multiple-choice quiz questions.

Each question must:
- Test understanding of a key concept from the lesson
- Have exactly 4 options labelled A, B, C, D
- Have exactly one correct answer
- Include a brief explanation of why the correct answer is right

Return ONLY a valid JSON array with this structure:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A) ...", "explanation": "..."}]

Lesson content:
${plainText}`

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const rawText = response.text ?? ''

  const jsonString = extractJson(rawText)

  let questions: unknown
  try {
    questions = JSON.parse(jsonString)
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse AI response as JSON', raw: rawText },
      { status: 502 }
    )
  }

  return NextResponse.json({ questions })
}
