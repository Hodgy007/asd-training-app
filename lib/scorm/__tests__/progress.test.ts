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

  // SCORM 2004 ----------------------------------------------------------

  it('marks complete when 2004 completion_status is completed', () => {
    const out = mapScormStateToProgress({
      'cmi.completion_status': 'completed',
      'cmi.success_status': 'unknown',
    })
    expect(out.completed).toBe(true)
  })

  it('marks complete when 2004 success_status is passed', () => {
    const out = mapScormStateToProgress({
      'cmi.completion_status': 'unknown',
      'cmi.success_status': 'passed',
    })
    expect(out.completed).toBe(true)
  })

  it('does not mark complete for 2004 incomplete + failed', () => {
    const out = mapScormStateToProgress({
      'cmi.completion_status': 'incomplete',
      'cmi.success_status': 'failed',
    })
    expect(out.completed).toBe(false)
  })

  it('uses 2004 cmi.score.scaled (0-1) as percentage', () => {
    const out = mapScormStateToProgress({
      'cmi.completion_status': 'completed',
      'cmi.score.scaled': '0.82',
    })
    expect(out.score).toBe(82)
  })

  it('clamps 2004 cmi.score.scaled into 0-1 range', () => {
    const out = mapScormStateToProgress({ 'cmi.score.scaled': '1.5' })
    expect(out.score).toBe(100)
  })

  it('falls back to 2004 cmi.score.raw/max when scaled missing', () => {
    const out = mapScormStateToProgress({
      'cmi.completion_status': 'completed',
      'cmi.score.raw': '7',
      'cmi.score.max': '10',
    })
    expect(out.score).toBe(70)
  })

  // Nav location persistence (LMS-level TOC position) ------------------

  it('stores navLocation in interactionData when supplied', () => {
    const out = mapScormStateToProgress(
      { 'cmi.core.lesson_status': 'incomplete' },
      'Etiquette/Course.html',
    )
    expect(out.interactionData.navLocation).toBe('Etiquette/Course.html')
    expect(out.interactionData.scorm).toEqual({
      'cmi.core.lesson_status': 'incomplete',
    })
  })

  it('omits navLocation when empty / whitespace / missing', () => {
    expect(mapScormStateToProgress({}).interactionData.navLocation).toBeUndefined()
    expect(mapScormStateToProgress({}, '').interactionData.navLocation).toBeUndefined()
    expect(mapScormStateToProgress({}, '   ').interactionData.navLocation).toBeUndefined()
    expect(mapScormStateToProgress({}, null).interactionData.navLocation).toBeUndefined()
  })

  it('preserves navLocation querystring (used by Golf-style quiz items)', () => {
    const out = mapScormStateToProgress(
      {},
      'shared/assessmenttemplate.html?questions=Playing',
    )
    expect(out.interactionData.navLocation).toBe(
      'shared/assessmenttemplate.html?questions=Playing',
    )
  })
})
