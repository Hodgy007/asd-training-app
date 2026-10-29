import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { GenerationPlanStep } from '../generation-plan-step'
import type { CourseBrief, Outline } from '@/lib/training-gen/schemas'

afterEach(cleanup)

const brief: CourseBrief = {
  audience: 'Teaching assistants',
  estimatedMinutes: 40,
  objectives: [
    { id: 'o1', text: 'Describe sensory overload' },
    { id: 'o2', text: 'Plan a calm space' },
    { id: 'o3', text: 'Explain routines' },
  ],
}
const outline: Outline = {
  programName: 'P',
  modules: [{
    title: 'Module one', description: '',
    lessons: [
      { title: 'Lesson A', summary: 's', objectiveIds: ['o1', 'o2'], sourceRefs: [{ fileIndex: 0, sectionIndices: [0] }] },
      { title: 'Lesson B', summary: 's', objectiveIds: ['o3'], sourceRefs: [{ fileIndex: 0, sectionIndices: [0] }] },
    ],
  }],
}

/** Keeps the step controlled, as the modal does. */
function Harness(props: { truncated?: boolean; warnings?: string[]; onGenerate?: (b: boolean) => void }) {
  const [b, setB] = useState(brief)
  const [o, setO] = useState(outline)
  return (
    <GenerationPlanStep
      brief={b}
      outline={o}
      warnings={props.warnings ?? []}
      truncated={props.truncated ?? false}
      onChange={(nb, no) => { setB(nb); setO(no) }}
      onBack={() => {}}
      onGenerate={props.onGenerate ?? (() => {})}
    />
  )
}

describe('GenerationPlanStep', () => {
  it('disables Generate lessons when every lesson is removed', () => {
    render(<Harness />)
    const generate = screen.getByRole('button', { name: 'Generate lessons' }) as HTMLButtonElement
    expect(generate.disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Remove lesson "Lesson A"' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove lesson "Lesson B"' }))
    expect(generate.disabled).toBe(true)
    expect(screen.queryByText('Module one')).toBeNull()
  })

  it('stops removing objectives at 3 and adding at 6', () => {
    render(<Harness />)
    const remove = screen.getAllByRole('button', { name: /^Remove objective/ }) as HTMLButtonElement[]
    expect(remove).toHaveLength(3)
    expect(remove.every((b) => b.disabled)).toBe(true)
    const add = screen.getByRole('button', { name: 'Add objective' }) as HTMLButtonElement
    fireEvent.click(add)
    fireEvent.click(add)
    fireEvent.click(add)
    expect(screen.getAllByRole('textbox', { name: /^Objective \d/ })).toHaveLength(6)
    expect(add.disabled).toBe(true)
  })

  it('shows the truncation warning when truncated is true', () => {
    render(<Harness truncated />)
    expect(screen.getByText(/Your files were longer than we can read at once/)).toBeTruthy()
  })

  it('passes the check-in choice to onGenerate', () => {
    const onGenerate = vi.fn()
    render(<Harness onGenerate={onGenerate} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add a check-in question inside each lesson' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate lessons' }))
    expect(onGenerate).toHaveBeenCalledWith(false)
  })

  it('notes objectives that no lesson covers any more', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove lesson "Lesson B"' }))
    expect(screen.getByText(/No lesson covers/).textContent).toContain('Explain routines')
  })
})
