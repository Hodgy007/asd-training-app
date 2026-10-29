import { describe, it, expect } from 'vitest'
import { programAccent, PROGRAM_ACCENT_COUNT } from '../program-accent'

describe('programAccent', () => {
  it('gives neighbouring programmes different colours', () => {
    for (let i = 0; i < PROGRAM_ACCENT_COUNT * 2; i++) {
      expect(programAccent(i).band).not.toBe(programAccent(i + 1).band)
    }
  })

  it('cycles once the palette runs out', () => {
    expect(programAccent(PROGRAM_ACCENT_COUNT)).toEqual(programAccent(0))
  })

  it('never returns undefined for odd input', () => {
    expect(programAccent(-1)).toBeDefined()
  })
})
