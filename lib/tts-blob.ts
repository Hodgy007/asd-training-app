import { list, put } from '@vercel/blob'
import crypto from 'crypto'

// ElevenLabs — "Daniel" (British male, confident). Duplicated from the route
// so prewarm can run without importing the route file.
export const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'

// Pathname scheme keeps voice clips isolated per voice so swapping voices
// doesn't require blowing away the whole cache.
function blobPathname(hash: string, voiceId: string): string {
  return `tts/${voiceId}/${hash}.mp3`
}

export function ttsHash(text: string, voiceId: string = DEFAULT_VOICE_ID): string {
  return crypto.createHash('sha256').update(`${voiceId}|${text}`).digest('hex')
}

// Hot cache of pathname → public URL. Lives for the lifetime of the function
// instance so a warm container resolves cache hits without a Blob list() call.
const urlCache = new Map<string, string>()

/**
 * Return the public Blob URL for this text if it's already been synthesised,
 * else null. Hits the in-process cache first, then falls back to `list()` for
 * a cold instance (which adds ~200ms — hence the in-memory layer).
 */
export async function getCachedTtsUrl(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<string | null> {
  const hash = ttsHash(text, voiceId)
  const pathname = blobPathname(hash, voiceId)

  const hot = urlCache.get(pathname)
  if (hot) return hot

  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    if (blobs.length > 0 && blobs[0].pathname === pathname) {
      urlCache.set(pathname, blobs[0].url)
      return blobs[0].url
    }
  } catch (err) {
    console.error('[tts-blob] list failed:', err)
  }
  return null
}

/**
 * Upload an MP3 buffer to the Blob cache under the deterministic pathname.
 * Returns the public URL. Idempotent — repeat calls with the same text
 * simply overwrite (allowOverwrite defaults to true) and re-return the URL.
 */
export async function storeTtsToBlob(
  text: string,
  mp3: Buffer,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<string> {
  const hash = ttsHash(text, voiceId)
  const pathname = blobPathname(hash, voiceId)
  const blob = await put(pathname, mp3, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'audio/mpeg',
    // One year — audio content is keyed by hash of the text, so the bytes at
    // a given URL never change. Clients (and any CDN along the way) can cache
    // aggressively.
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    allowOverwrite: true,
  })
  urlCache.set(pathname, blob.url)
  return blob.url
}

/**
 * Call ElevenLabs and return MP3 bytes. Validates the response is actually
 * audio — ElevenLabs occasionally returns 200 with a JSON body on transient
 * provider issues, and that would poison the Blob cache.
 */
export async function generateMp3FromElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Buffer> {
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
        text,
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
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 300)}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('audio/')) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `ElevenLabs returned non-audio content-type "${contentType}": ${detail.slice(0, 200)}`
    )
  }

  const arrayBuffer = await res.arrayBuffer()
  if (arrayBuffer.byteLength === 0) {
    throw new Error('ElevenLabs returned 0 bytes')
  }
  return Buffer.from(arrayBuffer)
}

/**
 * Convenience: fetch-or-generate. Returns the public Blob URL — guaranteed
 * to exist when the promise resolves.
 */
export async function ensureTtsBlobUrl(
  text: string,
  apiKey: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<string> {
  const existing = await getCachedTtsUrl(text, voiceId)
  if (existing) return existing
  const mp3 = await generateMp3FromElevenLabs(text, voiceId, apiKey)
  return storeTtsToBlob(text, mp3, voiceId)
}
