import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@vercel/blob', () => ({ head: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
  },
}))

import { getServerSession } from 'next-auth'
import { head } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { GET } from '../route'

function makeReq(path = 'vr/Vi1503.mp4', range?: string) {
  return new NextRequest(`http://localhost/api/scorm/lesson-1/${path}`, {
    headers: range ? { range } : undefined,
  })
}

function ctx(path = ['vr', 'Vi1503.mp4']) {
  return { params: { lessonId: 'lesson-1', path } }
}

describe('GET /api/scorm/[lessonId]/[...path]', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset().mockResolvedValue({
      user: {
        id: 'u1',
        role: 'CAREGIVER',
        effectivePrograms: [{ id: 'program-1', name: 'Test program' }],
      },
    } as any)
    vi.mocked(prisma.lesson.findUnique).mockReset().mockResolvedValue({
      scormBlobPrefix: 'scorm/lesson-1',
      module: { programId: 'program-1' },
    } as any)
    vi.mocked(head).mockReset().mockResolvedValue({
      url: 'https://blob.example/scorm/lesson-1/vr/Vi1503.mp4',
      size: 1000,
      contentType: 'video/mp4',
    } as any)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array(100), {
          status: 206,
          headers: { 'content-type': 'video/mp4' },
        }),
      ),
    )
  })

  it('proxies byte ranges for SCORM videos with a 206 response', async () => {
    const res = await GET(makeReq('vr/Vi1503.mp4', 'bytes=0-99'), ctx())

    expect(res.status).toBe(206)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://blob.example/scorm/lesson-1/vr/Vi1503.mp4',
      { headers: { range: 'bytes=0-99' } },
    )
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('content-security-policy')).toContain('https://player.vimeo.com')
    expect(res.headers.get('content-security-policy')).toContain('https://fonts.googleapis.com')
    expect(res.headers.get('content-security-policy')).toContain('https://fonts.gstatic.com')
    expect(res.headers.get('content-security-policy')).toContain(
      "media-src 'self' blob: https://vimeo.com",
    )
    expect(res.headers.get('content-security-policy')).toContain(
      "connect-src 'self' https://vimeo.com",
    )
    expect(res.headers.get('content-range')).toBe('bytes 0-99/1000')
    expect(res.headers.get('content-length')).toBe('100')
    expect((await res.arrayBuffer()).byteLength).toBe(100)
  })

  it('returns 416 for an unsatisfiable range without fetching the blob body', async () => {
    const res = await GET(makeReq('vr/Vi1503.mp4', 'bytes=2000-2100'), ctx())

    expect(res.status).toBe(416)
    expect(res.headers.get('content-range')).toBe('bytes */1000')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('serves known Captivate runtime image fallbacks when the package omitted them', async () => {
    vi.mocked(head).mockRejectedValueOnce(new Error('missing from blob'))

    const res = await GET(
      makeReq('assets/htmlimages/checkBox_normal.png'),
      ctx(['assets', 'htmlimages', 'checkBox_normal.png']),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(await res.text()).toContain('<svg')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('keeps returning 404 for unknown missing package assets', async () => {
    vi.mocked(head).mockRejectedValueOnce(new Error('missing from blob'))

    const res = await GET(
      makeReq('assets/missing-real-content.png'),
      ctx(['assets', 'missing-real-content.png']),
    )

    expect(res.status).toBe(404)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
