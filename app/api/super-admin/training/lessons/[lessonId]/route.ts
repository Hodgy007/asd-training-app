import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { getLessonById } from '@/lib/training-db'
import prisma from '@/lib/prisma'
import { LessonType, Prisma } from '@prisma/client'
import { validateInteractiveBlocks, parseInteractiveBlocksLenient } from '@/lib/interactive-blocks'
import { extractLessonTtsTexts } from '@/lib/tts-extract'
import { sanitizeHtml } from '@/lib/sanitize'
import {
  DEFAULT_VOICE_ID,
  generateMp3FromElevenLabs,
  getCachedTtsUrl,
  storeTtsToBlob,
} from '@/lib/tts-blob'

// Allowed schemes/hosts for `videoUrl`. Stored values flow into <video src=...>
// and the YouTube/Vimeo embed-detector in components/training/video-player.tsx,
// so a `javascript:` or `data:` URL would land in a learner-rendered DOM.
function validateVideoUrl(value: unknown): { ok: true; value: string | null } | { ok: false; reason: string } {
  if (value === null || value === '') return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false, reason: 'videoUrl must be a string or null' }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, reason: 'videoUrl is not a valid URL' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'videoUrl must use http(s)' }
  }
  return { ok: true, value }
}

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
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          closesAt: true,
          _count: { select: { questions: true } },
        },
      },
    },
  })
  if (!lessonWithModule) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Replace raw Blob URLs with the auth-gated proxy. Even charity admin
  // browser history is a leak vector for these.
  const sanitised = {
    ...lessonWithModule,
    attachments: lessonWithModule.attachments.map((a) => ({
      ...a,
      url: `/api/training/attachments/${a.id}/file`,
    })),
  }

  return NextResponse.json(sanitised)
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
  const { title, type, content, videoUrl, transcript, order, active, interactiveBlocks, surveyId } = body

  if (type !== undefined && !Object.values(LessonType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(LessonType).join(', ')}` }, { status: 400 })
  }

  if (type === LessonType.SURVEY || (type === undefined && existing.type === LessonType.SURVEY && surveyId !== undefined)) {
    const linkedSurveyId = surveyId === undefined ? existing.surveyId : surveyId
    if (!linkedSurveyId || typeof linkedSurveyId !== 'string') {
      return NextResponse.json({ error: 'Survey lessons must be linked to a published survey.' }, { status: 400 })
    }

    const survey = await prisma.survey.findFirst({
      where: {
        id: linkedSurveyId,
        status: 'PUBLISHED',
        OR: [
          { closesAt: null },
          { closesAt: { gt: new Date() } },
        ],
      },
      select: { id: true },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Linked survey must be published and open.' }, { status: 400 })
    }
  }

  // Sanitize HTML on write (defence-in-depth — every render path also
  // sanitizes, but doing it here means a future render path that forgets
  // to call sanitize can't leak whatever the editor sent us).
  const safeContent = content !== undefined && typeof content === 'string'
    ? sanitizeHtml(content)
    : undefined
  const safeTranscript = transcript !== undefined && typeof transcript === 'string'
    ? sanitizeHtml(transcript)
    : undefined

  // Validate videoUrl scheme — see validateVideoUrl for rationale.
  let safeVideoUrl: string | null | undefined
  if (videoUrl !== undefined) {
    const check = validateVideoUrl(videoUrl)
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 })
    safeVideoUrl = check.value
  }

  // Validate interactive blocks JSON shape against the schema before persisting.
  // An undefined input means the field isn't being touched; an explicit empty
  // array clears the blocks. Anything else must round-trip through the Zod
  // schema or we reject — stops admins from poking arbitrary JSON in via curl.
  let safeBlocks: unknown
  if (interactiveBlocks !== undefined) {
    if (interactiveBlocks === null || (Array.isArray(interactiveBlocks) && interactiveBlocks.length === 0)) {
      safeBlocks = []
    } else {
      const parsed = validateInteractiveBlocks(interactiveBlocks)
      if (!parsed) {
        return NextResponse.json({ error: 'Invalid interactiveBlocks payload' }, { status: 400 })
      }
      safeBlocks = parsed
    }
  }

  const updated = await prisma.lesson.update({
    where: { id: params.lessonId },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(safeContent !== undefined && { content: safeContent }),
      ...(safeVideoUrl !== undefined && { videoUrl: safeVideoUrl }),
      ...(order !== undefined && { order }),
      ...(active !== undefined && { active }),
      ...(safeTranscript !== undefined && { transcript: safeTranscript }),
      ...(safeBlocks !== undefined && { interactiveBlocks: safeBlocks as Prisma.InputJsonValue }),
      ...(surveyId !== undefined && { surveyId: surveyId || null }),
      ...(type !== undefined && type !== LessonType.SURVEY && { surveyId: null }),
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
  const blocks = parseInteractiveBlocksLenient(interactiveBlocks).blocks
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
