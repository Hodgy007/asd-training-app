import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/ai-runner', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai-runner')>('@/lib/ai-runner')
  return { AiUnavailableError: actual.AiUnavailableError, runPromptObject: vi.fn() }
})

import { runPromptObject, AiUnavailableError } from '@/lib/ai-runner'
import { generateCheckedQuiz, ruleProblems } from '../quiz'
import type { QuizDraft } from '../schemas'

type Q = QuizDraft['questions'][number]
const q = (question: string, over: Partial<Q> = {}): Q => ({
  question, options: ['Calm', 'Loud', 'Busy', 'Bright'], correctIndex: 0, explanation: 'Because.', objectiveId: 'o1', kind: 'recall', ...over,
})
const pass = (index: number) => ({ index, answerableFromLesson: true, exactlyOneCorrect: true, clearWording: true, issue: null })
const fail = (index: number, issue: string) => ({ index, answerableFromLesson: false, exactlyOneCorrect: true, clearWording: true, issue })

const objectives = [{ id: 'o1', text: 'Describe calm spaces' }]
const args = { lessonHtml: '<p>Calm spaces help.</p>', objectives, audience: 'Teaching assistants', lens: 'practitioner' as const, count: 2 }

/** Routes mocked runPromptObject calls by prompt key. */
function respond(handlers: Record<string, Array<unknown | Error>>) {
  vi.mocked(runPromptObject).mockImplementation(async (...callArgs: unknown[]) => {
    const key = String(callArgs[0])
    const next = handlers[key]?.shift()
    if (next instanceof Error) throw next
    if (next === undefined) throw new Error(`unexpected call to ${key}`)
    return next as never
  })
}

beforeEach(() => {
  vi.mocked(runPromptObject).mockReset()
})

describe('generateCheckedQuiz', () => {
  it('returns reviewed questions in the stored format', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1'), q('Q2', { correctIndex: 2 })] }],
      'training.quizReview': [{ verdicts: [pass(0), pass(1)] }],
    })
    const result = await generateCheckedQuiz(args)
    expect(result).toHaveLength(2)
    expect(result[1].correctAnswer).toBe('Busy')
    for (const r of result) {
      expect(r.options).toContain(r.correctAnswer)
      expect(r.needsReview).toBeUndefined()
    }
  })

  it('regenerates failed questions once', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1'), q('Bad')] }, { questions: [q('Better')] }],
      'training.quizReview': [{ verdicts: [pass(0), fail(1, 'Not in the lesson.')] }, { verdicts: [pass(0)] }],
    })
    const result = await generateCheckedQuiz(args)
    expect(vi.mocked(runPromptObject).mock.calls.filter((c) => c[0] === 'training.quiz.v2')).toHaveLength(2)
    expect(result.map((r) => r.question)).toEqual(['Q1', 'Better'])
    expect(result.every((r) => r.needsReview === undefined)).toBe(true)
  })

  it('flags questions that still fail after one retry', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1'), q('Bad')] }, { questions: [q('Still bad')] }],
      'training.quizReview': [{ verdicts: [pass(0), fail(1, 'Not in the lesson.')] }, { verdicts: [fail(0, 'Two answers fit.')] }],
    })
    const result = await generateCheckedQuiz(args)
    expect(result.find((r) => r.question === 'Still bad')?.needsReview).toBe('Two answers fit.')
  })

  it('keeps questions and flags them when the review call fails', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1'), q('Q2')] }],
      'training.quizReview': [new AiUnavailableError('failed')],
    })
    const result = await generateCheckedQuiz(args)
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.needsReview === 'Not checked: the checking step failed')).toBe(true)
  })
})

describe('generateCheckedQuiz prompt inputs', () => {
  it('tells the quiz prompt who it is for', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1')] }],
      'training.quizReview': [{ verdicts: [pass(0)] }],
    })
    await generateCheckedQuiz({ ...args, count: 1 })
    const call = vi.mocked(runPromptObject).mock.calls.find((c) => c[0] === 'training.quiz.v2')
    expect(call?.[1].audience).toBe('Teaching assistants')
  })
})

describe('generateCheckedQuiz when things go wrong', () => {
  it('keeps the first round when the rewrite call fails', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1'), q('Bad')] }, new AiUnavailableError('failed')],
      'training.quizReview': [{ verdicts: [pass(0), fail(1, 'Not in the lesson.')] }],
    })
    const result = await generateCheckedQuiz(args)
    expect(result.map((r) => r.question)).toEqual(['Q1', 'Bad'])
    expect(result[1].needsReview).toBe('Not in the lesson.')
  })

  it('drops questions that cannot be stored instead of saving a blank answer', async () => {
    respond({
      'training.quiz.v2': [{ questions: [q('Q1'), q('Broken', { correctIndex: 7 })] }, { questions: [q('Still broken', { options: ['a', 'b'] })] }],
      'training.quizReview': [{ verdicts: [pass(0)] }],
    })
    const result = await generateCheckedQuiz(args)
    expect(result.map((r) => r.question)).toEqual(['Q1'])
    expect(result.every((r) => r.options.includes(r.correctAnswer))).toBe(true)
  })
})

describe('ruleProblems', () => {
  it('ruleProblems catches NOT in the autism lens but not the practitioner lens', () => {
    const negative = q('Which of these is NOT helpful?')
    expect(ruleProblems(negative, 'autism')).not.toBeNull()
    expect(ruleProblems(negative, 'practitioner')).toBeNull()
  })

  it('ruleProblems catches duplicate options and all-of-the-above', () => {
    expect(ruleProblems(q('Q', { options: ['Calm', 'calm ', 'Busy', 'Bright'] }), 'practitioner')).not.toBeNull()
    expect(ruleProblems(q('Q', { options: ['Calm', 'Loud', 'Busy', 'All of the above'] }), 'practitioner')).not.toBeNull()
  })

  it('ruleProblems catches a wrong option count and an out-of-range answer', () => {
    expect(ruleProblems(q('Q', { options: ['a', 'b', 'c'] }), 'practitioner')).not.toBeNull()
    expect(ruleProblems(q('Q', { correctIndex: 4 }), 'practitioner')).not.toBeNull()
  })
})
