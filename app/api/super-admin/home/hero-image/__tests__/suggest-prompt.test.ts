import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/rbac', () => ({ isSuperAdmin: vi.fn() }))
vi.mock('@/lib/ai-runner', () => ({
  runPrompt: vi.fn(),
  AI_FEATURE_UNAVAILABLE: '__unavailable__',
}))

import { getServerSession } from 'next-auth'
import { isSuperAdmin } from '@/lib/rbac'
import { runPrompt } from '@/lib/ai-runner'
import { POST } from '../suggest-prompt/route'

function req(body: unknown): NextRequest {
  return new NextRequest('http://test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/super-admin/home/hero-image/suggest-prompt', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(isSuperAdmin).mockReset()
    vi.mocked(runPrompt).mockReset()
  })

  it('returns 401 unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(req({}))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-super-admins', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(false)
    const res = await POST(req({}))
    expect(res.status).toBe(403)
  })

  it('builds a context-aware brief from role + block context', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(runPrompt).mockResolvedValue('Soft yellow shapes')

    const res = await POST(
      req({
        role: 'STUDENT',
        blockKind: 'hero',
        blockTitle: 'Welcome',
        blockSubtitle: 'Your training awaits',
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ prompt: 'Soft yellow shapes' })

    const callArgs = vi.mocked(runPrompt).mock.calls[0]
    expect(callArgs[0]).toBe('homepage.heroImage.suggestPrompt')
    const brief = callArgs[1].brief
    expect(brief).toContain('STUDENT')
    expect(brief).toContain('hero')
    expect(brief).toContain('Welcome')
    expect(brief).toContain('Your training awaits')
  })

  it('falls back to a generic brief when no context is provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(runPrompt).mockResolvedValue('A banner')
    await POST(req({}))
    const brief = vi.mocked(runPrompt).mock.calls[0][1].brief
    expect(brief).toMatch(/Ambitious about Autism/)
  })

  it('truncates very long title and subtitle to bound the brief size', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(runPrompt).mockResolvedValue('A banner')
    await POST(
      req({
        blockTitle: 'a'.repeat(500),
        blockSubtitle: 'b'.repeat(800),
      }),
    )
    const brief = vi.mocked(runPrompt).mock.calls[0][1].brief
    // Title trimmed to 200, subtitle trimmed to 300
    expect(brief.length).toBeLessThan(700)
  })

  it('returns empty prompt when AI is unavailable (graceful degradation)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u' } } as never)
    vi.mocked(isSuperAdmin).mockReturnValue(true)
    vi.mocked(runPrompt).mockResolvedValue('__unavailable__')
    const res = await POST(req({}))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ prompt: '' })
  })
})
