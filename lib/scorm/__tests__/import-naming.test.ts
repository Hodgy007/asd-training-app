import { describe, it, expect } from 'vitest'
import { deriveProgramName, generateScormId } from '../import-naming'

describe('deriveProgramName', () => {
  it('strips .zip extension', () => {
    expect(deriveProgramName('Autism_Awareness.zip')).toBe('Autism Awareness')
  })

  it('handles uppercase .ZIP', () => {
    expect(deriveProgramName('Course.ZIP')).toBe('Course')
  })

  it('collapses underscores, hyphens and dots to single spaces', () => {
    expect(deriveProgramName('Autism_Awareness-Level_1.zip')).toBe(
      'Autism Awareness Level 1',
    )
  })

  it('title-cases plain-lowercase words but leaves mixed-case words alone', () => {
    expect(deriveProgramName('introduction-to-iOS-v2.zip')).toBe(
      'Introduction To iOS v2',
    )
  })

  it('strips directory prefixes defensively', () => {
    expect(deriveProgramName('/uploads/Lesson 1.zip')).toBe('Lesson 1')
    expect(deriveProgramName('C:\\tmp\\Module A.zip')).toBe('Module A')
  })

  it('returns a sensible default for empty / noisy input', () => {
    expect(deriveProgramName('')).toBe('SCORM Training')
    expect(deriveProgramName(null)).toBe('SCORM Training')
    expect(deriveProgramName(undefined)).toBe('SCORM Training')
    expect(deriveProgramName('.zip')).toBe('SCORM Training')
    expect(deriveProgramName('   ')).toBe('SCORM Training')
  })
})

describe('generateScormId', () => {
  it('produces URL-safe IDs matching the admin API regex', () => {
    const id = generateScormId('module')
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
  })

  it('namespaces by kind', () => {
    expect(generateScormId('module')).toMatch(/^scorm-module-/)
    expect(generateScormId('lesson')).toMatch(/^scorm-lesson-/)
  })

  it('is unique across calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateScormId('lesson')))
    expect(ids.size).toBe(50)
  })
})
