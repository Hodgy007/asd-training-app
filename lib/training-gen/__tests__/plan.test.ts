import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/ai-runner', () => ({ runPromptObject: vi.fn() }))

import { runPromptObject } from '@/lib/ai-runner'
import { generatePlan, validateOutline, normaliseBrief, pruneOutline } from '../plan'
import type { CourseBrief, Outline } from '../schemas'
import type { ParsedFile } from '@/lib/content-generator-types'

const files: ParsedFile[] = [
  { filename: 'guide.pdf', format: 'pdf', sections: [{ heading: 'Intro', content: 'Hello' }, { content: 'More' }] },
]
const brief: CourseBrief = {
  audience: 'Teaching assistants',
  estimatedMinutes: 30,
  objectives: [
    { id: 'o1', text: 'Describe sensory overload' },
    { id: 'o2', text: 'Plan a calm space' },
    { id: 'o3', text: 'Explain routines' },
  ],
}
const lesson = (title: string, extra: Partial<Outline['modules'][number]['lessons'][number]> = {}) => ({
  title, summary: 's', objectiveIds: ['o1', 'o2', 'o3'], sourceRefs: [{ fileIndex: 0, sectionIndices: [0] }], ...extra,
})
const outlineOf = (lessons: ReturnType<typeof lesson>[]): Outline => ({
  programName: 'P', modules: [{ title: 'M1', description: 'd', lessons }],
})

beforeEach(() => {
  vi.mocked(runPromptObject).mockReset()
})

describe('validateOutline', () => {
  it('validateOutline drops refs to missing sections and removes empty lessons', () => {
    const { outline, warnings } = validateOutline(
      outlineOf([
        lesson('Keeps one', { sourceRefs: [{ fileIndex: 0, sectionIndices: [0, 99] }] }),
        lesson('Points nowhere', { sourceRefs: [{ fileIndex: 5, sectionIndices: [0] }] }),
      ]),
      files,
      brief,
    )
    expect(outline.modules[0].lessons.map((l) => l.title)).toEqual(['Keeps one'])
    expect(outline.modules[0].lessons[0].sourceRefs).toEqual([{ fileIndex: 0, sectionIndices: [0] }])
    expect(warnings.join(' ')).toContain('Points nowhere')
  })

  it('validateOutline drops unknown objective ids and warns about uncovered objectives', () => {
    const { outline, warnings } = validateOutline(
      outlineOf([lesson('Only o1', { objectiveIds: ['o1', 'o9'] })]),
      files,
      brief,
    )
    expect(outline.modules[0].lessons[0].objectiveIds).toEqual(['o1'])
    expect(warnings.join(' ')).toContain('Plan a calm space')
  })

  it('validateOutline clamps modules to 12 and lessons per module to 10', () => {
    const many: Outline = {
      programName: 'P',
      modules: Array.from({ length: 14 }, (_, m) => ({
        title: `M${m}`, description: '', lessons: Array.from({ length: 12 }, (_, l) => lesson(`L${m}.${l}`)),
      })),
    }
    const { outline } = validateOutline(many, files, brief)
    expect(outline.modules).toHaveLength(12)
    expect(outline.modules[0].lessons).toHaveLength(10)
  })
})

describe('normaliseBrief', () => {
  it('normaliseBrief clamps objectives to 6 and renumbers their ids', () => {
    const { brief: b } = normaliseBrief({
      ...brief,
      objectives: Array.from({ length: 8 }, (_, i) => ({ id: 'x', text: `Objective ${i}` })),
    })
    expect(b.objectives.map((o) => o.id)).toEqual(['o1', 'o2', 'o3', 'o4', 'o5', 'o6'])
  })
})

describe('pruneOutline', () => {
  it('pruneOutline removes empty modules', () => {
    const o: Outline = { programName: 'P', modules: [{ title: 'Empty', description: '', lessons: [] }, outlineOf([lesson('L')]).modules[0]] }
    expect(pruneOutline(o).modules.map((m) => m.title)).toEqual(['M1'])
  })
})

describe('generatePlan', () => {
  it('generatePlan reports truncation', async () => {
    vi.mocked(runPromptObject)
      .mockResolvedValueOnce(brief as never)
      .mockResolvedValueOnce(outlineOf([lesson('L')]) as never)
    const big: ParsedFile[] = [{ filename: 'big.pdf', format: 'pdf', sections: [{ content: 'x'.repeat(200_001) }] }]
    const result = await generatePlan(big, 'Big programme')
    expect(result.truncated).toBe(true)
    expect(vi.mocked(runPromptObject).mock.calls[0][0]).toBe('training.brief')
    expect(vi.mocked(runPromptObject).mock.calls[1][0]).toBe('training.outline.v2')
  })
})
