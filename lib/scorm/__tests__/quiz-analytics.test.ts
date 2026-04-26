import { describe, it, expect } from 'vitest'
import {
  aggregateQuizPerformance,
  extractInteractions,
  parseLatencySeconds,
} from '../quiz-analytics'

describe('extractInteractions', () => {
  it('groups cmi.interactions.N.* keys by index', () => {
    const out = extractInteractions({
      'cmi.interactions.0.id': 'Q1',
      'cmi.interactions.0.result': 'correct',
      'cmi.interactions.1.id': 'Q2',
      'cmi.interactions.1.result': 'wrong',
      'cmi.core.lesson_status': 'completed', // unrelated key — must ignore
    })
    expect(out).toHaveLength(2)
    expect(out.find((r) => r.id === 'Q1')?.result).toBe('correct')
    expect(out.find((r) => r.id === 'Q2')?.result).toBe('wrong')
  })

  it('drops interactions with no id', () => {
    // A snapshot mid-write may have a result without an id yet — skip it.
    const out = extractInteractions({
      'cmi.interactions.0.result': 'correct',
    })
    expect(out).toHaveLength(0)
  })

  it('captures 2004 description', () => {
    const out = extractInteractions({
      'cmi.interactions.0.id': 'Q1',
      'cmi.interactions.0.description': 'What is par?',
      'cmi.interactions.0.result': 'correct',
    })
    expect(out[0].description).toBe('What is par?')
  })
})

describe('parseLatencySeconds', () => {
  it('parses SCORM 1.2 HHHH:MM:SS.SS', () => {
    expect(parseLatencySeconds('0000:01:23.45')).toBeCloseTo(83.45, 2)
    expect(parseLatencySeconds('0001:00:00')).toBe(3600)
  })

  it('parses SCORM 2004 ISO 8601 PT...', () => {
    expect(parseLatencySeconds('PT1M23.45S')).toBeCloseTo(83.45, 2)
    expect(parseLatencySeconds('PT2H')).toBe(7200)
    expect(parseLatencySeconds('PT45S')).toBe(45)
  })

  it('returns null for unparseable / missing', () => {
    expect(parseLatencySeconds(undefined)).toBeNull()
    expect(parseLatencySeconds('')).toBeNull()
    expect(parseLatencySeconds('not-a-duration')).toBeNull()
    // Bare "P" with no time component is technically invalid for our purpose.
    expect(parseLatencySeconds('P')).toBeNull()
  })
})

describe('aggregateQuizPerformance', () => {
  it('returns empty array when given no snapshots', () => {
    expect(aggregateQuizPerformance([])).toEqual([])
  })

  it('counts attempts and correct answers per question id', () => {
    const out = aggregateQuizPerformance([
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'correct',
        'cmi.interactions.1.id': 'Q2',
        'cmi.interactions.1.result': 'wrong',
      },
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'wrong',
        'cmi.interactions.1.id': 'Q2',
        'cmi.interactions.1.result': 'correct',
      },
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'correct',
      },
    ])
    const q1 = out.find((q) => q.id === 'Q1')!
    const q2 = out.find((q) => q.id === 'Q2')!
    expect(q1.attempts).toBe(3)
    expect(q1.correct).toBe(2)
    expect(q1.pctCorrect).toBe(67)
    expect(q2.attempts).toBe(2)
    expect(q2.correct).toBe(1)
    expect(q2.pctCorrect).toBe(50)
  })

  it('treats SCORM 2004 "incorrect" as not correct (only "correct" counts)', () => {
    const out = aggregateQuizPerformance([
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'incorrect',
      },
    ])
    expect(out[0].correct).toBe(0)
    expect(out[0].pctCorrect).toBe(0)
  })

  it('sorts results by pctCorrect ascending (worst questions first)', () => {
    const out = aggregateQuizPerformance([
      // Q1: 1/2 = 50%
      { 'cmi.interactions.0.id': 'Q1', 'cmi.interactions.0.result': 'correct' },
      { 'cmi.interactions.0.id': 'Q1', 'cmi.interactions.0.result': 'wrong' },
      // Q2: 0/1 = 0%
      { 'cmi.interactions.0.id': 'Q2', 'cmi.interactions.0.result': 'wrong' },
      // Q3: 1/1 = 100%
      { 'cmi.interactions.0.id': 'Q3', 'cmi.interactions.0.result': 'correct' },
    ])
    expect(out.map((q) => q.id)).toEqual(['Q2', 'Q1', 'Q3'])
  })

  it('preserves the most recently seen description', () => {
    const out = aggregateQuizPerformance([
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.description': 'Old wording',
        'cmi.interactions.0.result': 'correct',
      },
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.description': 'Refined wording',
        'cmi.interactions.0.result': 'correct',
      },
    ])
    expect(out[0].description).toBe('Refined wording')
  })

  it('averages latency across attempts when present', () => {
    const out = aggregateQuizPerformance([
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'correct',
        'cmi.interactions.0.latency': 'PT10S',
      },
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'correct',
        'cmi.interactions.0.latency': 'PT20S',
      },
    ])
    expect(out[0].avgLatencySeconds).toBe(15)
  })

  it('reports avgLatencySeconds=null when no learner provided latency', () => {
    const out = aggregateQuizPerformance([
      {
        'cmi.interactions.0.id': 'Q1',
        'cmi.interactions.0.result': 'correct',
      },
    ])
    expect(out[0].avgLatencySeconds).toBeNull()
  })
})
