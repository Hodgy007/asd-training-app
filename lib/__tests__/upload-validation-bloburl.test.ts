import { describe, it, expect } from 'vitest'
import { isVercelBlobUrl } from '../upload-validation'

describe('isVercelBlobUrl', () => {
  it('accepts https Vercel Blob hosts', () => {
    expect(isVercelBlobUrl('https://abc123.public.blob.vercel-storage.com/library/documents/x.pdf')).toBe(true)
    expect(isVercelBlobUrl('https://store.blob.vercel-storage.com/x')).toBe(true)
    expect(isVercelBlobUrl('https://blob.vercel-storage.com/x')).toBe(true)
  })

  it('rejects non-https, other hosts, and internal addresses (SSRF)', () => {
    expect(isVercelBlobUrl('http://abc.public.blob.vercel-storage.com/x')).toBe(false)
    expect(isVercelBlobUrl('https://evil.example.com/x')).toBe(false)
    expect(isVercelBlobUrl('https://169.254.169.254/latest/meta-data')).toBe(false)
    expect(isVercelBlobUrl('https://blob.vercel-storage.com.evil.com/x')).toBe(false)
    expect(isVercelBlobUrl('file:///etc/passwd')).toBe(false)
    expect(isVercelBlobUrl('not a url')).toBe(false)
    expect(isVercelBlobUrl('')).toBe(false)
    expect(isVercelBlobUrl(null)).toBe(false)
    expect(isVercelBlobUrl(undefined)).toBe(false)
  })
})
