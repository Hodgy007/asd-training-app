import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
  put: vi.fn(),
}))

import { list, put } from '@vercel/blob'
import { bannerCacheKey, getCachedBannerUrl, storeBannerToBlob } from '../banner-blob'

describe('bannerCacheKey', () => {
  it('produces a stable hash from systemPrompt + userPrompt + model + aspectRatio', () => {
    const a = bannerCacheKey('sys', 'user', 'm', '3:1')
    const b = bannerCacheKey('sys', 'user', 'm', '3:1')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('changes when systemPrompt changes (invalidates on brand update)', () => {
    expect(bannerCacheKey('v1', 'u', 'm', '3:1')).not.toBe(
      bannerCacheKey('v2', 'u', 'm', '3:1'),
    )
  })

  it('changes when aspectRatio changes', () => {
    expect(bannerCacheKey('s', 'u', 'm', '3:1')).not.toBe(
      bannerCacheKey('s', 'u', 'm', '4:1'),
    )
  })
})

describe('getCachedBannerUrl', () => {
  beforeEach(() => {
    vi.mocked(list).mockReset()
  })

  it('returns the URL when the listed pathname matches the computed hash', async () => {
    const hash = bannerCacheKey('sys', 'user', 'm', '3:1')
    vi.mocked(list).mockResolvedValue({
      blobs: [
        { pathname: `home-banners/${hash}.png`, url: 'https://blob/match.png' } as never,
      ],
      cursor: '',
      hasMore: false,
    } as never)
    const url = await getCachedBannerUrl('sys', 'user', 'm', '3:1')
    expect(url).toBe('https://blob/match.png')
  })

  it('returns null on a cache miss', async () => {
    vi.mocked(list).mockResolvedValue({ blobs: [], cursor: '', hasMore: false } as never)
    const url = await getCachedBannerUrl('sys', 'user', 'm', '3:1')
    expect(url).toBeNull()
  })

  it('returns null when list throws', async () => {
    vi.mocked(list).mockRejectedValue(new Error('blob down'))
    const url = await getCachedBannerUrl('sys', 'user', 'm', '3:1')
    expect(url).toBeNull()
  })
})

describe('storeBannerToBlob', () => {
  beforeEach(() => {
    vi.mocked(put).mockReset()
  })

  it('uploads to the deterministic pathname and returns the URL', async () => {
    vi.mocked(put).mockResolvedValue({ url: 'https://blob/abc.png' } as never)
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const url = await storeBannerToBlob('sys', 'user', 'm', '3:1', png)
    expect(url).toBe('https://blob/abc.png')
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^home-banners\/[a-f0-9]{64}\.png$/),
      png,
      expect.objectContaining({ access: 'public', contentType: 'image/png' }),
    )
  })
})
