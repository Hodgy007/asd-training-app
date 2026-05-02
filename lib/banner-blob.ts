import { list, put } from '@vercel/blob'
import crypto from 'crypto'

/** In-memory hot cache: pathname → public URL. Saves ~200 ms per lookup on a warm Lambda. */
const urlCache = new Map<string, string>()

/** Test-only helper to reset the in-memory cache between test cases. */
export function _resetBannerUrlCache(): void {
  urlCache.clear()
}

/**
 * Deterministic cache key. Including `systemPrompt` means edits to the AAA
 * brand prompt naturally invalidate old entries — no manual cache busting
 * needed. Old generations stay in Blob (cheap), just unreachable by hash.
 */
export function bannerCacheKey(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  aspectRatio: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${systemPrompt}|${userPrompt}|${model}|${aspectRatio}`)
    .digest('hex')
}

function blobPathname(hash: string): string {
  return `home-banners/${hash}.png`
}

export async function getCachedBannerUrl(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  aspectRatio: string,
): Promise<string | null> {
  const hash = bannerCacheKey(systemPrompt, userPrompt, model, aspectRatio)
  const pathname = blobPathname(hash)

  const hot = urlCache.get(pathname)
  if (hot) return hot

  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    if (blobs.length > 0 && blobs[0].pathname === pathname) {
      urlCache.set(pathname, blobs[0].url)
      return blobs[0].url
    }
  } catch (err) {
    console.error('[banner-blob] list failed:', err)
  }
  return null
}

export async function storeBannerToBlob(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  aspectRatio: string,
  png: Buffer,
): Promise<string> {
  const hash = bannerCacheKey(systemPrompt, userPrompt, model, aspectRatio)
  const pathname = blobPathname(hash)
  const blob = await put(pathname, png, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'image/png',
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    allowOverwrite: true,
  })
  urlCache.set(pathname, blob.url)
  return blob.url
}
