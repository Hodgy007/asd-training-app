import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { createRateLimiter } from '@/lib/rate-limit'
import {
  DEFAULT_VOICE_ID,
  generateMp3FromElevenLabs,
  getCachedTtsUrl,
  storeTtsToBlob,
} from '@/lib/tts-blob'

// 30 requests / minute / user. Cache hits are cheap, but every miss
// spends an ElevenLabs token (~$0.02 per minute synthesised). Without
// this cap a logged-in user can script unique-text POSTs and drain the
// monthly budget; a normal lesson play hits the cache on second use.
const ttsLimiter = createRateLimiter('tts', 60_000, 30)

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

  const rate = await ttsLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many TTS requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

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

  // Cache-hit fast path: fetch the MP3 from Blob into memory and return the
  // bytes through this route. A 302-redirect to the Blob host is ruled out
  // because cross-origin fetch redirects need CORS headers the Blob host
  // doesn't reliably send for binary GETs (the browser would reject it with
  // "Failed to fetch"). Streaming via blobRes.body was tried and ruled out
  // too — Next.js/Vercel's response pipeline can apply transfer-encoding or
  // gzip transforms to streamed bodies that corrupt binary audio, producing
  // MEDIA_ERR_SRC_NOT_SUPPORTED on the <audio> element. Buffering into a
  // Uint8Array matches the miss path below, which is known to work.
  const cachedUrl = await getCachedTtsUrl(parsed.text, voiceId)
  if (cachedUrl) {
    try {
      const blobRes = await fetch(cachedUrl)
      if (blobRes.ok) {
        const arrayBuffer = await blobRes.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        // Sanity-check MP3 magic bytes before serving — guards against a
        // stale/corrupted Blob silently poisoning the learner's audio
        // element. Valid MP3 frames start with 0xFF 0xFB/0xFA/0xF3/0xF2 or
        // an ID3 tag ("ID3"). If neither matches, fall through to regenerate.
        const looksLikeMp3 =
          (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // "ID3"
          (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) // MPEG frame sync
        if (looksLikeMp3 && bytes.byteLength > 0) {
          return new NextResponse(bytes, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': String(bytes.byteLength),
              'Cache-Control': 'private, max-age=86400',
              'X-Tts-Cache': 'HIT',
            },
          })
        }
        console.warn('[tts] cached blob failed MP3 sanity check, regenerating:', cachedUrl)
        // Fall through to regeneration — fresh bytes overwrite the stale blob.
      } else {
        console.warn('[tts] cached blob unreachable:', blobRes.status, cachedUrl)
      }
    } catch (err) {
      console.error('[tts] error reading cached blob:', err)
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
