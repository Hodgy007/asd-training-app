import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/training-gen/lesson', () => ({ generateLesson: vi.fn() }))
vi.mock('@/lib/training-gen/quiz', () => ({ generateCheckedQuiz: vi.fn() }))

import { getServerSession } from 'next-auth'
import { generateLesson } from '@/lib/training-gen/lesson'
import { generateCheckedQuiz } from '@/lib/training-gen/quiz'
import { POST } from '../route'

const brief = { audience: 'a', estimatedMinutes: 10, objectives: [{ id: 'o1', text: 'Describe x' }] }
const outline = {
  programName: 'P',
  modules: [{ title: 'M', description: '', lessons: [{ title: 'L', summary: 's', objectiveIds: ['o1'], sourceRefs: [{ fileIndex: 0, sectionIndices: [0] }] }] }],
}
const parsedContent = [{ filename: 'a.pdf', format: 'pdf', sections: [{ content: 'x' }] }]
const block = { id: 'b1', type: 'knowledge-check', title: 'Check your understanding', instructions: 'i', order: 0, data: { questions: [] } }

async function events(res: Response) {
  const text = await res.text()
  return text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)))
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AI_GATEWAY_API_KEY = 'test'
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: `u-${Math.random()}`, role: 'SUPER_ADMIN' } } as never)
})

describe('POST /api/super-admin/training/generate-content', () => {
  it('generate-content streams lesson-complete with interactiveBlocks', async () => {
    vi.mocked(generateLesson).mockResolvedValue({ content: '<p>c</p>', interactiveBlocks: [block] } as never)
    vi.mocked(generateCheckedQuiz).mockResolvedValue([{ question: 'Q', options: ['a', 'b', 'c', 'd'], correctAnswer: 'a', explanation: 'e' }])
    const res = await POST(new NextRequest('http://localhost/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brief, outline, parsedContent, lens: 'autism', includeCheckIns: true }),
    }))
    const all = await events(res)
    const done = all.find((e) => e.type === 'lesson-complete')
    expect(done.interactiveBlocks).toEqual([block])
    const complete = all.find((e) => e.type === 'complete')
    expect(complete.program.brief).toEqual(brief)
    expect(complete.program.modules[0].lessons[0].sourceRefs).toEqual(outline.modules[0].lessons[0].sourceRefs)
    expect(vi.mocked(generateLesson).mock.calls[0][0]).toMatchObject({ lens: 'autism', includeCheckIn: true, moduleIndex: 0, lessonIndex: 0 })
  })

  it('rejects a request without a brief', async () => {
    const res = await POST(new NextRequest('http://localhost/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outline, parsedContent, lens: 'autism', includeCheckIns: true }),
    }))
    expect(res.status).toBe(400)
  })
})
