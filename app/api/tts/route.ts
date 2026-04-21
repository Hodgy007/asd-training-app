import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import crypto from 'crypto'

// ElevenLabs — "Daniel" (British male, confident). Same voice used for the
// ambient-pitch video demo — see remotion-demo/VOICEOVER-SCRIPT.md.
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'

// Hard cap on text length per request. Covers full lesson content plus
// individual interactive block banners. Anything larger is almost certainly abuse.
const MAX_CHARS = 8000

const bodySchema = z.object({
  text: z.string().min(1).max(MAX_CHARS),
  // voice is fixed server-side for now but reserved for future overrides.
  voiceId: z.string().optional(),
})

// In-process cache, keyed by sha256(text|voice). ElevenLabs charges per
// character — caching prevents paying every time a learner reopens a lesson.
// Limited to ~64 entries to avoid memory bloat over long deployments.
const audioCache = new Map<string, Buffer>()
const MAX_CACHE_ENTRIES = 64

function cacheKey(text: string, voiceId: string): string {
  return crypto.createHash('sha256').update(`${voiceId}|${text}`).digest('hex')
}

function putInCache(key: string, buf: Buffer) {
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = audioCache.keys().next().value
    if (oldest) audioCache.delete(oldest)
  }
  audioCache.set(key, buf)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Text-to-speech is not configured (missing ELEVENLABS_API_KEY).' },
      { status: 503 }
    )
  }

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const voiceId = parsed.voiceId || DANIEL_VOICE_ID
  const key = cacheKey(parsed.text, voiceId)
  const cached = audioCache.get(key)
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=86400',
        'X-Tts-Cache': 'HIT',
      },
    })
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: parsed.text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return NextResponse.json(
      { error: 'Text-to-speech provider error.', detail: detail.slice(0, 200) },
      { status: 502 }
    )
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  putInCache(key, buffer)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=86400',
      'X-Tts-Cache': 'MISS',
    },
  })
}
