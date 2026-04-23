import { describe, it, expect } from 'vitest'
import { mapScormStateToProgress } from '../progress'

describe('mapScormStateToProgress', () => {
  it('marks complete when lesson_status is completed', () => {
    const out = mapScormStateToProgress({
      'cmi.core.lesson_status': 'completed',
      'cmi.core.score.raw': '85',
      'cmi.core.score.max': '100',
    })
    expect(out.completed).toBe(true)
    expect(out.score).toBe(85)
  })

  it('marks complete when lesson_status is passed', () => {
    const out = mapScormStateToProgress({ 'cmi.core.lesson_status': 'passed' })
    expect(out.completed).toBe(true)
  })

  it('does not mark complete for incomplete/browsed/failed', () => {
    for (const status of ['incomplete', 'browsed', 'failed', 'not attempted']) {
      const out = mapScormStateToProgress({ 'cmi.core.lesson_status': status })
      expect(out.completed).toBe(false)
    }
  })

  it('stores full cmi state in interactionData for resume', () => {
    const cmi = {
      'cmi.core.lesson_status': 'incomplete',
      'cmi.core.lesson_location': 'slide-3',
      'cmi.suspend_data': 'abc',
    }
    const out = mapScormStateToProgress(cmi)
    expect(out.interactionData).toEqual({ scorm: cmi })
  })

  it('normalises score to percentage when max present', () => {
    const out = mapScormStateToProgress({
      'cmi.core.score.raw': '4',
      'cmi.core.score.min': '0',
      'cmi.core.score.max': '5',
    })
    expect(out.score).toBe(80)
  })

  it('ignores non-numeric scores', () => {
    const out = mapScormStateToProgress({ 'cmi.core.score.raw': '' })
    expect(out.score).toBeNull()
  })
})
