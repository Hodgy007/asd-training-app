import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('ai', () => ({
  generateImage: vi.fn(),
}))

import { generateImage } from 'ai'
import { generateBannerPng } from '../banner-generator'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('generateBannerPng', () => {
  beforeEach(() => {
    vi.mocked(generateImage).mockReset()
  })

  it('returns the PNG bytes when the model returns a valid image', async () => {
    vi.mocked(generateImage).mockResolvedValue({
      image: { uint8Array: new Uint8Array(PNG_MAGIC), mediaType: 'image/png' },
      images: [{ uint8Array: new Uint8Array(PNG_MAGIC), mediaType: 'image/png' }],
    } as never)
    const buf = await generateBannerPng('a prompt', 'google/gemini-2.5-flash-image-preview', '3:1')
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
  })

  it('falls back to images[0].uint8Array when image is absent', async () => {
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    vi.mocked(generateImage).mockResolvedValue({
      image: undefined,
      images: [{ uint8Array: new Uint8Array(PNG_MAGIC), mediaType: 'image/png' }],
    } as never)
    const buf = await generateBannerPng('a prompt', 'google/gemini-2.5-flash-image-preview', '3:1')
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
  })

  it('throws when the response is not a PNG', async () => {
    vi.mocked(generateImage).mockResolvedValue({
      image: { uint8Array: new Uint8Array([0xff, 0xd8, 0xff]), mediaType: 'image/jpeg' },
      images: [{ uint8Array: new Uint8Array([0xff, 0xd8, 0xff]), mediaType: 'image/jpeg' }],
    } as never)
    await expect(
      generateBannerPng('a prompt', 'google/gemini-2.5-flash-image-preview', '3:1'),
    ).rejects.toThrow(/PNG/i)
  })

  it('throws when the model returns 0 bytes', async () => {
    vi.mocked(generateImage).mockResolvedValue({
      image: { uint8Array: new Uint8Array([]), mediaType: 'image/png' },
      images: [{ uint8Array: new Uint8Array([]), mediaType: 'image/png' }],
    } as never)
    await expect(
      generateBannerPng('a prompt', 'google/gemini-2.5-flash-image-preview', '3:1'),
    ).rejects.toThrow(/0 bytes/)
  })
})
