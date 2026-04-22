import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { getLessonById } from '@/lib/training-db'
import prisma from '@/lib/prisma'
import { LessonType } from '@prisma/client'
import { validateInteractiveBlocks } from '@/lib/interactive-blocks'
import { extractLessonTtsTexts } from '@/lib/tts-extract'
import {
  DEFAULT_VOICE_ID,
  generateMp3FromElevenLabs,
  getCachedTtsUrl,
  storeTtsToBlob,
} from '@/lib/tts-blob'

interface Params {
  params: { lessonId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await getLessonById(params.lessonId)
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Include module info
  const lessonWithModule = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      module: true,
      quizQuestions: { orderBy: { order: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
    },
  })

  return NextResponse.json(lessonWithModule)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!existing) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const body = await req.json()
  const { title, type, content, videoUrl, transcript, order, active, interactiveBlocks } = body

  if (type !== undefined && !Object.values(LessonType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(LessonType).join(', ')}` }, { status: 400 })
  }

  const updated = await prisma.lesson.update({
    where: { id: params.lessonId },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(order !== undefined && { order }),
      ...(active !== undefined && { active }),
      ...(transcript !== undefined && { transcript }),
      ...(interactiveBlocks !== undefined && { interactiveBlocks }),
    },
  })

  // Pre-warm the TTS cache whenever the narratable text changes. Fire-and-forget:
  // the admin's save completes immediately and synthesis keeps running on this
  // function instance until it finishes (or the instance recycles — safe to
  // drop mid-flight because the prewarm is idempotent).
  if (content !== undefined || interactiveBlocks !== undefined) {
    void prewarmLessonTts(updated.content, updated.interactiveBlocks).catch((err) => {
      console.error('[tts-prewarm] background prewarm failed:', err)
    })
  }

  return NextResponse.json(updated)
}

async function prewarmLessonTts(content: string, interactiveBlocks: unknown): Promise<void> {
  const envKey = process.env.ELEVENLABS_API_KEY
  if (!envKey) return
  const apiKey: string = envKey
  const blocks = validateInteractiveBlocks(interactiveBlocks) ?? []
  const texts = extractLessonTtsTexts(content || '', blocks)
  if (texts.length === 0) return

  // Bounded concurrency — 3 parallel ElevenLabs calls is well under their
  // rate limit and keeps total runtime sane.
  const CONCURRENCY = 3
  let cursor = 0
  async function next(): Promise<void> {
    const i = cursor++
    if (i >= texts.length) return
    const text = texts[i]
    try {
      const cached = await getCachedTtsUrl(text, DEFAULT_VOICE_ID)
      if (!cached) {
        const mp3 = await generateMp3FromElevenLabs(text, DEFAULT_VOICE_ID, apiKey)
        await storeTtsToBlob(text, mp3, DEFAULT_VOICE_ID)
      }
    } catch (err) {
      console.error('[tts-prewarm] segment failed (length', text.length, '):', err)
    }
    return next()
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, next))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!existing) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  await prisma.lesson.delete({ where: { id: params.lessonId } })
  return NextResponse.json({ success: true })
}
