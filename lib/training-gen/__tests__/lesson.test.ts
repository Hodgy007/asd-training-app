import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai-runner', () => ({ runPromptObject: vi.fn() }))

import { assembleLesson, outlineContext } from '../lesson'
import { splitContentAtBlocks, validateInteractiveBlocks } from '@/lib/interactive-blocks'
import type { LessonDraft, Outline } from '../schemas'

const draft = (over: Partial<LessonDraft> = {}): LessonDraft => ({
  whatYouWillLearn: ['Spot early signs of overload'],
  bodyHtml: '<p>Body text here.</p>',
  keyPoints: ['One', 'Two', 'Three'],
  checkIn: { question: 'Which helps?', options: ['Quiet', 'Noise', 'Crowds'], correctIndex: 0, feedback: 'Quiet helps.' },
  imageAlts: [],
  ...over,
})

describe('assembleLesson', () => {
  it('assembleLesson puts sections in the fixed order', () => {
    const { content } = assembleLesson(draft(), { includeCheckIn: true, blockId: 'b1' })
    const order = ["What you'll learn", 'Body text here.', '[INTERACTIVE:b1]', 'Key points'].map((s) => content.indexOf(s))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('assembleLesson output splits into html/block/html segments', () => {
    const { content, interactiveBlocks } = assembleLesson(draft(), { includeCheckIn: true, blockId: 'b1' })
    expect(interactiveBlocks).toHaveLength(1)
    expect(interactiveBlocks[0]).toMatchObject({ id: 'b1', type: 'knowledge-check', title: 'Check your understanding' })
    expect(splitContentAtBlocks(content, interactiveBlocks).map((s) => s.type)).toEqual(['html', 'block', 'html'])
  })

  it('assembleLesson omits the check-in when includeCheckIn is false or checkIn is null', () => {
    for (const result of [
      assembleLesson(draft(), { includeCheckIn: false, blockId: 'b1' }),
      assembleLesson(draft({ checkIn: null }), { includeCheckIn: true, blockId: 'b1' }),
    ]) {
      expect(result.content).not.toContain('[INTERACTIVE:')
      expect(result.interactiveBlocks).toEqual([])
    }
  })

  it('the check-in block passes the app interactive-block validation', () => {
    const { interactiveBlocks } = assembleLesson(draft(), { includeCheckIn: true, blockId: 'b1' })
    expect(validateInteractiveBlocks(interactiveBlocks)).not.toBeNull()
  })

  it('escapes plain-text fields', () => {
    const { content } = assembleLesson(draft({ keyPoints: ['a < b & "c"', 'x', 'y'] }), { includeCheckIn: false, blockId: 'b1' })
    expect(content).toContain('a &lt; b &amp; &quot;c&quot;')
  })

  it('applies alt text from imageAlts', () => {
    const { content } = assembleLesson(
      draft({ bodyHtml: '<p><img src="https://x/a.png" alt="Training image"></p>', imageAlts: [{ url: 'https://x/a.png', alt: 'A quiet room' }] }),
      { includeCheckIn: false, blockId: 'b1' },
    )
    expect(content).toContain('alt="A quiet room"')
    expect(content).not.toContain('Training image')
  })

  it('uses a neutral fallback alt for unmatched images', () => {
    const { content } = assembleLesson(draft({ bodyHtml: '<p><img src="https://x/b.png"></p>' }), { includeCheckIn: false, blockId: 'b1' })
    expect(content).toContain('alt="Image from the source material"')
  })

  it('clamps keyPoints to 5 and drops check-in options beyond 3', () => {
    const { content, interactiveBlocks } = assembleLesson(
      draft({
        keyPoints: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'],
        checkIn: { question: 'Q', options: ['a', 'b', 'c', 'd'], correctIndex: 1, feedback: 'f' },
      }),
      { includeCheckIn: true, blockId: 'b1' },
    )
    expect(content).toContain('k5')
    expect(content).not.toContain('k6')
    const data = interactiveBlocks[0].data as { questions: { options: string[]; correctAnswer: string }[] }
    expect(data.questions[0].options).toEqual(['a', 'b', 'c'])
    expect(data.questions[0].correctAnswer).toBe('b')
  })

  it('drops the check-in when fewer than 3 options remain or the answer is out of range', () => {
    for (const checkIn of [
      { question: 'Q', options: ['a', 'b'], correctIndex: 0, feedback: 'f' },
      { question: 'Q', options: ['a', 'b', 'c', 'd'], correctIndex: 3, feedback: 'f' },
    ]) {
      expect(assembleLesson(draft({ checkIn }), { includeCheckIn: true, blockId: 'b1' }).interactiveBlocks).toEqual([])
    }
  })
})

describe('outlineContext', () => {
  it('outlineContext marks the current lesson', () => {
    const outline: Outline = {
      programName: 'P',
      modules: [{ title: 'M', description: '', lessons: [
        { title: 'First', summary: 'one', objectiveIds: [], sourceRefs: [] },
        { title: 'Second', summary: 'two', objectiveIds: [], sourceRefs: [] },
      ] }],
    }
    const text = outlineContext(outline, 0, 1)
    expect(text).toContain('Module 1 › Lesson 1: First — one')
    expect(text).toContain('Module 1 › Lesson 2: Second — two (THIS LESSON)')
    expect(text).not.toContain('First — one (THIS LESSON)')
  })
})
