import { describe, it, expect } from 'vitest'
import { assemblePrompt } from '../ai-runner-assemble'

describe('assemblePrompt', () => {
  const base = {
    purpose: 'Write a short personal statement.',
    tone: 'Friendly and plain-English.',
    requirements: ['Use UK English', '3-4 sentences'],
    exampleOutput: null as string | null,
    inputVariables: ['name', 'experience'],
    responseFormat: 'Plain text, 3-4 sentences.',
    contextFiles: [] as Array<{ fileName: string; parsedText: string }>,
  }

  it('assembles sections in fixed order and fills placeholders', () => {
    const out = assemblePrompt(base, { name: 'Alex', experience: 'Baker' })
    expect(out.indexOf('Write a short personal statement.')).toBeLessThan(
      out.indexOf('Friendly and plain-English.'),
    )
    expect(out.indexOf('Friendly and plain-English.')).toBeLessThan(
      out.indexOf('Requirements:'),
    )
    expect(out).toContain('Alex')
    expect(out).toContain('Baker')
    expect(out).toContain('Use UK English')
    expect(out).toContain('Plain text, 3-4 sentences.')
  })

  it('omits the Reference material block when no context files', () => {
    const out = assemblePrompt(base, { name: 'A', experience: 'B' })
    expect(out).not.toContain('Reference material')
  })

  it('includes context files with per-file headers', () => {
    const out = assemblePrompt(
      {
        ...base,
        contextFiles: [
          { fileName: 'brand.md', parsedText: 'Always capitalise "Ambitious".' },
          { fileName: 'style.txt', parsedText: 'Prefer active voice.' },
        ],
      },
      { name: 'A', experience: 'B' },
    )
    expect(out).toContain('Reference material:')
    expect(out).toContain('--- FILE: brand.md ---')
    expect(out).toContain('Always capitalise "Ambitious".')
    expect(out).toContain('--- FILE: style.txt ---')
  })

  it('renders missing placeholder values as empty strings (does not throw)', () => {
    const out = assemblePrompt(base, { name: 'A' })
    expect(out).toContain('A')
    expect(out).not.toContain('${experience}')
  })

  it('includes example output when provided', () => {
    const out = assemblePrompt(
      { ...base, exampleOutput: 'I am a reliable team member.' },
      { name: 'A', experience: 'B' },
    )
    expect(out).toContain('Example output:')
    expect(out).toContain('I am a reliable team member.')
  })
})
