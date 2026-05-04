import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
    trainingProgress: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/training/progress/scorm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/training/progress/scorm', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset().mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.lesson.findUnique).mockReset().mockResolvedValue({
      type: 'SCORM',
      moduleId: 'module-1',
    } as any)
    vi.mocked(prisma.trainingProgress.findUnique).mockReset().mockResolvedValue(null)
    vi.mocked(prisma.trainingProgress.upsert).mockReset().mockResolvedValue({ id: 'progress-1' } as any)
  })

  it('accepts nested renderCommitCMI payloads from scorm-again', async () => {
    const res = await POST(req({
      moduleId: 'module-1',
      lessonId: 'lesson-1',
      navLocation: 'index.html',
      cmi: {
        completionStatus: 'completed',
        successStatus: 'passed',
        runtimeData: {
          cmi: {
            completion_status: 'completed',
            success_status: 'passed',
            score: { scaled: 0.84 },
            suspend_data: { slide: 24 },
          },
        },
      },
    }))

    expect(res.status).toBe(200)
    const upsertArg = vi.mocked(prisma.trainingProgress.upsert).mock.calls[0][0] as any
    expect(upsertArg.create.completed).toBe(true)
    expect(upsertArg.create.score).toBe(84)
    expect(upsertArg.create.interactionData.scorm).toMatchObject({
      'cmi.completion_status': 'completed',
      'cmi.success_status': 'passed',
      'cmi.score.scaled': '0.84',
      'cmi.suspend_data.slide': '24',
    })
  })
})
