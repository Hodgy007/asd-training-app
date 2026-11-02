// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/training-gen/limits', () => ({ checkTrainingPlanLimits: vi.fn(async () => null) }))
vi.mock('@/lib/file-parser', () => ({ parseFiles: vi.fn(), getSupportedExtensions: () => ['.pdf', '.docx', '.pptx'] }))
vi.mock('@/lib/training-gen/lesson', () => ({ generateLesson: vi.fn() }))
vi.mock('@/lib/training-gen/quiz', () => ({ generateCheckedQuiz: vi.fn(async () => []) }))

import { getServerSession } from 'next-auth'
import { generateLesson } from '@/lib/training-gen/lesson'
import { POST } from '../route'

const brief = { audience: 'a', estimatedMinutes: 20, objectives: [{ id: 'o1', text: 'Describe A' }, { id: 'o2', text: 'Describe B' }] }
const lesson = (title: string, objectiveIds: string[], sectionIndices: number[], error?: string) => ({
  title, summary: `${title} summary`, objectiveIds, sourceRefs: [{ fileIndex: 0, sectionIndices }],
  content: error ? '' : '<p>x</p>', order: 1, quizQuestions: [], interactiveBlocks: [], ...(error ? { error } : {}),
})
const files = [{ filename: 'f.pdf', format: 'pdf', sections: [{ content: 'A text' }, { content: 'B text' }, { content: 'C text' }] }]

function req(metadata: unknown) {
  const form = new FormData()
  form.append('metadata', JSON.stringify(metadata))
  return new NextRequest('http://localhost/api/super-admin/training/parse-and-regenerate', { method: 'POST', body: form })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AI_GATEWAY_API_KEY = 'test'
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as never)
  vi.mocked(generateLesson).mockResolvedValue({ content: '<p>new</p>', interactiveBlocks: [] })
})

describe('POST /api/super-admin/training/parse-and-regenerate', () => {
  it('regenerates the lesson at that position in the edited program, from its own sources', async () => {
    // The admin moved lesson B above lesson A in the preview; B failed.
    const program = {
      programName: 'P', brief,
      modules: [{ title: 'M', description: '', order: 1, lessons: [lesson('B', ['o2'], [1], 'failed'), lesson('A', ['o1'], [0])] }],
    }
    const res = await POST(req({ existingParsedContent: files, program, failedLessons: [{ moduleIndex: 0, lessonIndex: 0 }], lens: 'autism' }))
    await res.text()
    const args = vi.mocked(generateLesson).mock.calls[0][0]
    const target = args.outline.modules[0].lessons[0]
    expect(target.title).toBe('B')
    expect(target.objectiveIds).toEqual(['o2'])
    expect(target.sourceRefs).toEqual([{ fileIndex: 0, sectionIndices: [1] }])
    expect(args.outline.modules[0].lessons[1].title).toBe('A')
  })
})
