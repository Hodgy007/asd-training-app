import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/training-gen/plan', () => ({ generatePlan: vi.fn() }))
vi.mock('@/lib/training-gen/limits', () => ({ checkTrainingPlanLimits: vi.fn(async () => null) }))

import { getServerSession } from 'next-auth'
import { generatePlan } from '@/lib/training-gen/plan'
import { AiUnavailableError } from '@/lib/ai-runner'
import { POST } from '../route'

const files = [{ filename: 'a.pdf', format: 'pdf', sections: [{ content: 'x' }] }]
function req(body: unknown) {
  return new NextRequest('http://localhost/api/super-admin/training/generate-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AI_GATEWAY_API_KEY = 'test'
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as never)
})

describe('POST /api/super-admin/training/generate-plan', () => {
  it('returns 403 without MANAGE_TRAINING', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u2', role: 'LEARNER' } } as never)
    expect((await POST(req({ parsedContent: files, programName: 'P' }))).status).toBe(403)
  })

  it('returns the plan', async () => {
    vi.mocked(generatePlan).mockResolvedValue({ brief: { audience: 'a' }, outline: { modules: [] }, warnings: [], truncated: false } as never)
    const res = await POST(req({ parsedContent: files, programName: 'P' }))
    expect(res.status).toBe(200)
    expect((await res.json()).brief.audience).toBe('a')
  })

  it('returns 502 when the AI is unavailable', async () => {
    vi.mocked(generatePlan).mockRejectedValue(new AiUnavailableError('missing_prompt'))
    expect((await POST(req({ parsedContent: files, programName: 'P' }))).status).toBe(502)
  })
})
