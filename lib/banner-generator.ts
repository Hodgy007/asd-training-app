import { generateImage } from 'ai'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return false
  }
  return true
}

/**
 * Generate a banner PNG via the AI Gateway. The full prompt (style preamble +
 * user intent) is passed in as one string; this function does not assemble it.
 * Returns raw PNG bytes. Throws on any failure (gateway error, non-PNG, empty).
 * Callers should catch and translate into a structured API error.
 */
export async function generateBannerPng(
  fullPrompt: string,
  model: string,
  aspectRatio: '3:1' | '4:1',
): Promise<Buffer> {
  // The `as Parameters<...>[0]` cast is needed because `generateImage`'s
  // parameter shape varies per provider (e.g., some providers route aspectRatio
  // via providerOptions). Validated against google/gemini-2.5-flash-image-preview.
  const result = await generateImage({
    model,
    prompt: fullPrompt,
    aspectRatio,
    maxRetries: 2,
  } as Parameters<typeof generateImage>[0])

  const bytes = result.image?.uint8Array ?? result.images?.[0]?.uint8Array
  if (!bytes || bytes.length === 0) {
    throw new Error('Image gateway returned 0 bytes')
  }
  if (!isPng(bytes)) {
    throw new Error('Image gateway response is not a PNG')
  }
  return Buffer.from(bytes)
}
