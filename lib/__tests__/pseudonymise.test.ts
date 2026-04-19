import { describe, it, expect } from 'vitest'
import {
  deriveAgeBucket,
  pseudonymiseChildForAi,
  pseudonymiseObservationForAi,
} from '../pseudonymise'

describe('deriveAgeBucket', () => {
  const now = new Date('2026-04-19T00:00:00Z')

  it('classifies a child under 2 as "under-2y"', () => {
    expect(deriveAgeBucket(new Date('2025-01-01'), now)).toBe('under-2y')
  })
  it('classifies a 2-year-old as "2y"', () => {
    expect(deriveAgeBucket(new Date('2023-10-01'), now)).toBe('2y')
  })
  it('classifies a 3-year-old as "3y"', () => {
    expect(deriveAgeBucket(new Date('2022-10-01'), now)).toBe('3y')
  })
  it('classifies a 4- or 5-year-old as "4–5y"', () => {
    expect(deriveAgeBucket(new Date('2021-01-01'), now)).toBe('4–5y')
    expect(deriveAgeBucket(new Date('2020-10-01'), now)).toBe('4–5y')
  })
  it('classifies a 6+ year old as "6y+"', () => {
    expect(deriveAgeBucket(new Date('2019-01-01'), now)).toBe('6y+')
    expect(deriveAgeBucket(new Date('2010-01-01'), now)).toBe('6y+')
  })
})

describe('pseudonymiseChildForAi', () => {
  const child = {
    id: 'clxyz1234567890abcdef',
    dateOfBirth: new Date('2022-10-01'),
  }

  it('returns only a coded reference and an age bucket', () => {
    const out = pseudonymiseChildForAi(child)
    expect(Object.keys(out).sort()).toEqual(['ageBucket', 'code'])
  })

  it('never returns the full child id', () => {
    const out = pseudonymiseChildForAi(child)
    expect(JSON.stringify(out)).not.toContain(child.id)
  })

  it('never returns a name field', () => {
    const out = pseudonymiseChildForAi(child) as unknown as Record<string, unknown>
    expect(out.name).toBeUndefined()
    expect(out.fullName).toBeUndefined()
  })

  it('never returns a date-of-birth field', () => {
    const out = pseudonymiseChildForAi(child) as unknown as Record<string, unknown>
    expect(out.dateOfBirth).toBeUndefined()
    expect(out.dob).toBeUndefined()
  })

  it('produces a stable code for a given id', () => {
    const a = pseudonymiseChildForAi(child)
    const b = pseudonymiseChildForAi(child)
    expect(a.code).toBe(b.code)
  })
})

describe('pseudonymiseObservationForAi', () => {
  it('returns only coded behaviour fields — no free-text notes', () => {
    const out = pseudonymiseObservationForAi({
      date: new Date('2026-04-01T10:30:00Z'),
      behaviourType: 'Lines up toys',
      domain: 'BEHAVIOUR_AND_PLAY',
      frequency: 'OFTEN',
      context: 'HOME',
    })
    expect(Object.keys(out).sort()).toEqual([
      'behaviourType',
      'context',
      'date',
      'domain',
      'frequency',
    ])
    expect(out.date).toBe('2026-04-01')
  })
})
