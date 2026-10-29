import { describe, it, expect } from 'vitest'
import {
  courseBriefSchema,
  outlineSchema,
  lessonDraftSchema,
  quizDraftSchema,
  quizReviewSchema,
} from '../schemas'

describe('training generator schemas', () => {
  it('schemas accept a minimal valid example of each shape', () => {
    expect(courseBriefSchema.safeParse({
      audience: 'Teaching assistants',
      estimatedMinutes: 45,
      objectives: [{ id: 'o1', text: 'Describe sensory overload' }],
    }).success).toBe(true)

    expect(outlineSchema.safeParse({
      programName: 'P',
      modules: [{
        title: 'M', description: 'D',
        lessons: [{ title: 'L', summary: 'S', objectiveIds: ['o1'], sourceRefs: [{ fileIndex: 0, sectionIndices: [0] }] }],
      }],
    }).success).toBe(true)

    expect(lessonDraftSchema.safeParse({
      whatYouWillLearn: ['a'], bodyHtml: '<p>x</p>', keyPoints: ['k'], checkIn: null, imageAlts: [],
    }).success).toBe(true)

    expect(quizDraftSchema.safeParse({
      questions: [{ question: 'Q', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'E', objectiveId: 'o1', kind: 'recall' }],
    }).success).toBe(true)

    expect(quizReviewSchema.safeParse({
      verdicts: [{ index: 0, answerableFromLesson: true, exactlyOneCorrect: true, clearWording: true, issue: null }],
    }).success).toBe(true)
  })

  it('quizDraftSchema rejects an unknown kind', () => {
    expect(quizDraftSchema.safeParse({
      questions: [{ question: 'Q', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'E', objectiveId: 'o1', kind: 'essay' }],
    }).success).toBe(false)
  })
})
