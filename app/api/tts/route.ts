import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import {
  DEFAULT_VOICE_ID,
  generateMp3FromElevenLabs,
  getCachedTtsUrl,
  storeTtsToBlob,
} from '@/lib/tts-blob'

// Hard cap on text length per request. Covers full lesson content plus
// individual interactive block banners. Anything larger is almost certainly
// abuse or an accidental paste.
const MAX_CHARS = 8000

const bodySchema = z.object({
  text: z.string().min(1).max(MAX_CHARS),
  voiceId: z.string().optional(),
})

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

  const voiceId = parsed.voiceId || DEFAULT_VOICE_ID

  // Fast path: previously synthesised audio is sitting in Blob — redirect the
  // learner straight to the CDN-served MP3. No ElevenLabs call, no bytes
  // flowing through the function.
  const cachedUrl = await getCachedTtsUrl(parsed.text, voiceId)
  if (cachedUrl) {
    return NextResponse.redirect(cachedUrl, 302)
  }

  // Miss path: generate, upload to Blob, then redirect. The upload is awaited
  // so subsequent learners get the cached copy immediately. Cost on first
  // click is roughly: ElevenLabs latency + ~300ms for the Blob put.
  try {
    const mp3 = await generateMp3FromElevenLabs(parsed.text, voiceId, apiKey)
    const blobUrl = await storeTtsToBlob(parsed.text, mp3, voiceId)
    return NextResponse.redirect(blobUrl, 302)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Text-to-speech failed.'
    console.error('[tts] generation failed:', message)
    return NextResponse.json(
      { error: 'Text-to-speech provider error.', detail: message.slice(0, 200) },
      { status: 502 }
    )
  }
}
