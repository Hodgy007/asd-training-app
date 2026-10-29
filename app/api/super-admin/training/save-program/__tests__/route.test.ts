import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => {
  const tx = {
    trainingProgram: { aggregate: vi.fn(), create: vi.fn() },
    module: { create: vi.fn() },
    lesson: { create: vi.fn() },
    quizQuestion: { create: vi.fn() },
  }
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)), tx }
  return { prisma, default: prisma }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

const tx = (prisma as unknown as { tx: Record<string, Record<string, ReturnType<typeof vi.fn>>> }).tx

function req(body: unknown) {
  return new NextRequest('http://localhost/api/super-admin/training/save-program', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function program(lesson: Record<string, unknown>) {
  return {
    programName: 'Test programme',
    modules: [{ title: 'M1', description: '', lessons: [{ title: 'L1', content: '<p>Hi</p>', quizQuestions: [], ...lesson }] }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as never)
  tx.trainingProgram.aggregate.mockResolvedValue({ _max: { order: 1 } })
  tx.trainingProgram.create.mockResolvedValue({ id: 'prog1' })
})

describe('POST /api/super-admin/training/save-program', () => {
  it('sanitises lesson HTML before saving', async () => {
    const res = await POST(req(program({ content: '<p>Hi</p><script>alert(1)</script>' })))
    expect(res.status).toBe(201)
    expect(tx.lesson.create.mock.calls[0][0].data.content).toBe('<p>Hi</p>')
  })

  it('rejects a quiz whose correctAnswer is not one of its options', async () => {
    const res = await POST(
      req(program({
        quizQuestions: [{ question: 'Q?', options: ['a', 'b', 'c', 'd'], correctAnswer: 'e', explanation: '' }],
      })),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('correct answer')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('save-program stores interactiveBlocks and the objectives description', async () => {
    const block = { id: 'b1', type: 'knowledge-check', title: 'Check your understanding', instructions: 'Choose.', order: 0,
      data: { questions: [{ id: 'b1-q1', question: 'Q?', options: ['a', 'b', 'c'], correctAnswer: 'a', feedback: 'f' }] } }
    const body = {
      ...program({ interactiveBlocks: [block] }),
      brief: { audience: 'a', estimatedMinutes: 10, objectives: [{ id: 'o1', text: 'Spot <signs> early' }] },
    }
    const res = await POST(req(body))
    expect(res.status).toBe(201)
    expect(tx.lesson.create.mock.calls[0][0].data.interactiveBlocks).toEqual([block])
    const description = tx.trainingProgram.create.mock.calls[0][0].data.description
    expect(description).toContain('By the end of this programme you will be able to:')
    expect(description).toContain('Spot &lt;signs&gt; early')
  })

  it('save-program rejects invalid interactiveBlocks with 400', async () => {
    const res = await POST(req(program({ interactiveBlocks: [{ id: 'b1', type: 'not-a-block' }] })))
    expect(res.status).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
