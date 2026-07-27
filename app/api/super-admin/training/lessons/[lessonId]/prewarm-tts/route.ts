import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { parseInteractiveBlocksLenient } from '@/lib/interactive-blocks'
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

// Synthesis is slow (seconds per call) and we don't want to hammer ElevenLabs,
// so we run a small parallel pool. Three concurrent calls is gentle enough to
// stay well under their rate limit while still finishing a ten-segment lesson
// in roughly 15 seconds instead of 45.
const CONCURRENCY = 3

async function processQueue<T>(items: T[], worker: (item: T) => Promise<void>) {
  let cursor = 0
  async function next(): Promise<void> {
    const i = cursor++
    if (i >= items.length) return
    try {
      await worker(items[i])
    } catch (err) {
      console.error('[tts-prewarm] worker error:', err)
    }
    return next()
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, next))
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Text-to-speech is not configured.' },
      { status: 503 }
    )
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: { content: true, interactiveBlocks: true },
  })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const blocks = parseInteractiveBlocksLenient(lesson.interactiveBlocks).blocks
  const texts = extractLessonTtsTexts(lesson.content || '', blocks)

  let hit = 0
  let generated = 0
  let failed = 0

  await processQueue(texts, async (text) => {
    const cached = await getCachedTtsUrl(text, DEFAULT_VOICE_ID)
    if (cached) {
      hit++
      return
    }
    try {
      const mp3 = await generateMp3FromElevenLabs(text, DEFAULT_VOICE_ID, apiKey)
      await storeTtsToBlob(text, mp3, DEFAULT_VOICE_ID)
      generated++
    } catch (err) {
      failed++
      console.error('[tts-prewarm] failed for text of length', text.length, err)
    }
  })

  return NextResponse.json({
    lessonId: params.lessonId,
    total: texts.length,
    hit,
    generated,
    failed,
  })
}
