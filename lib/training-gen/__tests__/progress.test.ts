import { describe, it, expect } from 'vitest'
import { startProgram, applyEvent, finishCutOff, CUT_OFF_ERROR } from '../progress'
import type { CourseBrief, Outline } from '../schemas'

const brief: CourseBrief = { audience: 'a', estimatedMinutes: 20, objectives: [{ id: 'o1', text: 'Describe x' }] }
const outline: Outline = {
  programName: 'P',
  modules: [{ title: 'M', description: 'd', lessons: [
    { title: 'One', summary: 's1', objectiveIds: ['o1'], sourceRefs: [{ fileIndex: 0, sectionIndices: [0] }] },
    { title: 'Two', summary: 's2', objectiveIds: ['o1'], sourceRefs: [{ fileIndex: 0, sectionIndices: [1] }] },
    { title: 'Three', summary: 's3', objectiveIds: [], sourceRefs: [{ fileIndex: 0, sectionIndices: [2] }] },
  ] }],
}

describe('generation progress', () => {
  it('starts from the outline with everything a retry needs', () => {
    const p = startProgram(brief, outline)
    expect(p.brief).toBe(brief)
    expect(p.modules[0].lessons[1]).toMatchObject({ title: 'Two', summary: 's2', objectiveIds: ['o1'], content: '', order: 2 })
  })

  it('records finished lessons and quizzes as events arrive', () => {
    let p = startProgram(brief, outline)
    p = applyEvent(p, { type: 'lesson-complete', moduleIndex: 0, lessonIndex: 0, content: '<p>one</p>', interactiveBlocks: [] })
    p = applyEvent(p, { type: 'quiz-complete', moduleIndex: 0, lessonIndex: 0, questions: [{ question: 'Q', options: ['a', 'b', 'c', 'd'], correctAnswer: 'a', explanation: 'e' }] })
    p = applyEvent(p, { type: 'lesson-error', moduleIndex: 0, lessonIndex: 1, error: 'Gateway down' })
    expect(p.modules[0].lessons[0].content).toBe('<p>one</p>')
    expect(p.modules[0].lessons[0].quizQuestions).toHaveLength(1)
    expect(p.modules[0].lessons[1].error).toBe('Gateway down')
  })

  it('does not mark a written lesson as failed when only its quiz failed', () => {
    let p = startProgram(brief, outline)
    p = applyEvent(p, { type: 'lesson-complete', moduleIndex: 0, lessonIndex: 0, content: '<p>one</p>', interactiveBlocks: [] })
    p = applyEvent(p, { type: 'lesson-error', moduleIndex: 0, lessonIndex: 0, error: 'Quiz generation failed: x' })
    expect(p.modules[0].lessons[0].error).toBeUndefined()
  })

  it('marks lessons the run never reached so they can be retried', () => {
    let p = startProgram(brief, outline)
    p = applyEvent(p, { type: 'lesson-complete', moduleIndex: 0, lessonIndex: 0, content: '<p>one</p>', interactiveBlocks: [] })
    p = applyEvent(p, { type: 'lesson-error', moduleIndex: 0, lessonIndex: 1, error: 'Gateway down' })
    const done = finishCutOff(p)
    expect(done.modules[0].lessons.map((l) => l.error)).toEqual([undefined, 'Gateway down', CUT_OFF_ERROR])
  })
})
