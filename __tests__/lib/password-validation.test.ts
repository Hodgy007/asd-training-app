import { describe, it, expect } from 'vitest'
import { validatePassword } from '@/lib/password-validation'

describe('validatePassword', () => {
  // ── Valid passwords ──────────────────────────────────────────────────────────

  it('accepts a password that meets all requirements', () => {
    const result = validatePassword('Abcdefgh1!')
    expect(result).toEqual({ valid: true })
  })

  it('accepts a long complex password', () => {
    const result = validatePassword('MyStr0ng!Password#2024')
    expect(result).toEqual({ valid: true })
  })

  it('accepts a password with various special characters', () => {
    expect(validatePassword('Abcdefgh1@')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1#')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1$')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1%')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1^')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1&')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1*')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1(')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1)')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1[')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1{')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1<')).toEqual({ valid: true })
    expect(validatePassword('Abcdefgh1/')).toEqual({ valid: true })
  })

  // ── Length requirement ───────────────────────────────────────────────────────

  it('rejects an empty string', () => {
    const result = validatePassword('')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/at least 10 characters/)
  })

  it('rejects a password with 9 characters', () => {
    const result = validatePassword('Abcdef1!x')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/at least 10 characters/)
  })

  it('accepts a password with exactly 10 characters', () => {
    const result = validatePassword('Abcdefg1!x')
    expect(result).toEqual({ valid: true })
  })

  // ── Uppercase requirement ────────────────────────────────────────────────────

  it('rejects a password without an uppercase letter', () => {
    const result = validatePassword('abcdefgh1!')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/uppercase letter/)
  })

  // ── Lowercase requirement ────────────────────────────────────────────────────

  it('rejects a password without a lowercase letter', () => {
    const result = validatePassword('ABCDEFGH1!')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/lowercase letter/)
  })

  // ── Number requirement ───────────────────────────────────────────────────────

  it('rejects a password without a number', () => {
    const result = validatePassword('Abcdefghij!')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/one number/)
  })

  // ── Special character requirement ────────────────────────────────────────────

  it('rejects a password without a special character', () => {
    const result = validatePassword('Abcdefghi1')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/special character/)
  })

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it('rejects a password of only spaces', () => {
    const result = validatePassword('          ')
    expect(result.valid).toBe(false)
    // Spaces alone fail uppercase, lowercase, number, and special checks
  })

  it('handles unicode characters — still needs ASCII requirements', () => {
    // Unicode letters do not satisfy [A-Z] or [a-z] checks
    const result = validatePassword('\u00C9\u00E9\u00FC\u00F1\u00F6\u00E0\u00E8\u00EC\u00F2\u00F9')
    expect(result.valid).toBe(false)
  })

  it('accepts a password with unicode plus all ASCII requirements met', () => {
    const result = validatePassword('Abcdef\u00E91!xx')
    expect(result).toEqual({ valid: true })
  })

  it('checks requirements in order — length first', () => {
    // Short password missing everything else: should fail on length
    const result = validatePassword('a')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/at least 10 characters/)
  })

  it('returns only the first failing requirement', () => {
    // 10 chars, no uppercase, no number, no special
    const result = validatePassword('abcdefghij')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/uppercase letter/)
    // Should not mention number or special char in the same error
    expect(result.error).not.toMatch(/number/)
    expect(result.error).not.toMatch(/special/)
  })
})
