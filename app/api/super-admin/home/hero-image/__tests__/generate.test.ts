import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/rbac', () => ({ isSuperAdmin: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { aiPrompt: { findUnique: vi.fn() } },
}))
vi.mock('@/lib/banner-blob', () => ({
  getCachedBannerUrl: vi.fn(),
  storeBannerToBlob: vi.fn(),
}))
vi.mock('@/lib/banner-generator', () => ({
  generateBannerPng: vi.fn(),
}))
// Rate limiter: mock createRateLimiter to return a limiter whose check() always passes
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({ check: vi.fn(() => ({ success: true })) })),
  getClientIp: vi.fn(() => '1.2.3.4'),
}))

import { getServerSession } from 'next-auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getCachedBannerUrl, storeBannerToBlob } from '@/lib/banner-blob'
import { generateBannerPng } from '@/lib/banner-generator'
import { POST } from '../generate/route'

function req(body: unknown): NextRequest {
  return new NextRequest('http://test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

const promptRow = {
  key: 'homepage.heroImage.generate',
  enabled: true,
  model: 'google/gemini-2.5-flash-image-preview',
  requirements: ['rule one', 'rule two', 'Aspect ratio: {{aspectRatio}}.'],
  inputVariables: ['prompt', 'aspectRatio'],
}

describe('POST /api/super-admin/home/hero-image/generate', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(isSuperAdmin).mockReset()
    vi.mocked(prisma.aiPrompt.findUnique).mockReset()
    vi.mocked(getCachedBannerUrl).mockReset()
    vi.mocked(storeBannerToBlob).mockReset()
    vi.mocked(generateBannerPng).mockReset()
  })

  it('returns 401 unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(req({ prompt: 'x', aspectRatio: '3:1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-super-admins', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(false)
    const res = await POST(req({ prompt: 'x', aspectRatio: '3:1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when prompt is missing or too long', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    const res1 = await POST(req({ prompt: '', aspectRatio: '3:1' }))
    expect(res1.status).toBe(400)
    const res2 = await POST(req({ prompt: 'a'.repeat(501), aspectRatio: '3:1' }))
    expect(res2.status).toBe(400)
  })

  it('returns 400 for invalid aspectRatio', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    const res = await POST(req({ prompt: 'x', aspectRatio: '16:9' }))
    expect(res.status).toBe(400)
  })

  it('returns the cached URL on a cache hit (no generation)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(promptRow as never)
    vi.mocked(getCachedBannerUrl).mockResolvedValue('https://blob/x.png')

    const res = await POST(req({ prompt: 'x', aspectRatio: '3:1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ url: 'https://blob/x.png', cached: true })
    expect(generateBannerPng).not.toHaveBeenCalled()
  })

  it('generates, stores, and returns the URL on a cache miss', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(promptRow as never)
    vi.mocked(getCachedBannerUrl).mockResolvedValue(null)
    vi.mocked(generateBannerPng).mockResolvedValue(Buffer.from([0x89, 0x50]))
    vi.mocked(storeBannerToBlob).mockResolvedValue('https://blob/new.png')

    const res = await POST(req({ prompt: 'x', aspectRatio: '3:1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ url: 'https://blob/new.png', cached: false })
    expect(generateBannerPng).toHaveBeenCalledTimes(1)
    expect(storeBannerToBlob).toHaveBeenCalledTimes(1)
  })

  it('returns gateway_unavailable when generation throws', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(promptRow as never)
    vi.mocked(getCachedBannerUrl).mockResolvedValue(null)
    vi.mocked(generateBannerPng).mockRejectedValue(new Error('gateway down'))

    const res = await POST(req({ prompt: 'x', aspectRatio: '3:1' }))
    const body = await res.json()
    expect(res.status).toBe(502)
    expect(body.error).toBe('gateway_unavailable')
  })

  it('returns gateway_unavailable when the prompt row is missing or disabled', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(null)
    const res = await POST(req({ prompt: 'x', aspectRatio: '3:1' }))
    expect(res.status).toBe(502)
  })
})
