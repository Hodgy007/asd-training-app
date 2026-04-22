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

  // Cache-hit fast path: fetch the MP3 from Blob and stream it back through
  // this route. We can't 302-redirect the browser to the Blob URL because
  // fetch() following a cross-origin redirect needs CORS headers the Blob
  // host doesn't always send for public binary GETs — the browser would
  // reject the response with "Failed to fetch". Streaming keeps the learner's
  // connection same-origin and preserves session auth semantics.
  const cachedUrl = await getCachedTtsUrl(parsed.text, voiceId)
  if (cachedUrl) {
    try {
      const blobRes = await fetch(cachedUrl)
      if (blobRes.ok && blobRes.body) {
        return new NextResponse(blobRes.body, {
          status: 200,
          headers: {
            'Content-Type': blobRes.headers.get('content-type') || 'audio/mpeg',
            'Content-Length': blobRes.headers.get('content-length') || '',
            'Cache-Control': 'private, max-age=86400',
            'X-Tts-Cache': 'HIT',
          },
        })
      }
      console.warn('[tts] cached blob unreachable:', blobRes.status, cachedUrl)
      // Fall through to regeneration if the blob disappeared for any reason.
    } catch (err) {
      console.error('[tts] error streaming cached blob:', err)
      // Fall through.
    }
  }

  // Miss path: generate MP3, stream it to the learner now, upload to Blob in
  // parallel so the next learner gets the cached copy. We block on the upload
  // because fire-and-forget work inside a serverless function can be killed
  // before it finishes — an awaited put() guarantees the cache actually
  // populates. Adds ~300ms to first-click latency; all subsequent plays
  // bypass ElevenLabs entirely.
  try {
    const mp3 = await generateMp3FromElevenLabs(parsed.text, voiceId, apiKey)
    await storeTtsToBlob(parsed.text, mp3, voiceId)

    return new NextResponse(new Uint8Array(mp3), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(mp3.length),
        'Cache-Control': 'private, max-age=86400',
        'X-Tts-Cache': 'MISS',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Text-to-speech failed.'
    console.error('[tts] generation failed:', message)
    return NextResponse.json(
      { error: 'Text-to-speech provider error.', detail: message.slice(0, 200) },
      { status: 502 }
    )
  }
}
