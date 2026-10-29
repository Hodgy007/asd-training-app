import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { LessonSources, QuizReviewFlag } from '../generation-review'
import type { ParsedFile } from '@/lib/content-generator-types'

afterEach(cleanup)

const files: ParsedFile[] = [
  { filename: 'guide.pdf', format: 'pdf', sections: [{ heading: 'Sensory needs', content: 'A'.repeat(700) }, { content: 'Second section' }] },
]

describe('LessonSources', () => {
  it('lists each cited section by file and heading', () => {
    render(<LessonSources files={files} sourceRefs={[{ fileIndex: 0, sectionIndices: [0, 1] }]} />)
    expect(screen.getByText('Sources (2)')).toBeTruthy()
    expect(screen.getByText('guide.pdf — Sensory needs')).toBeTruthy()
    expect(screen.getByText('guide.pdf — Section 2')).toBeTruthy()
  })

  it('shows at most 600 characters of a section', () => {
    render(<LessonSources files={files} sourceRefs={[{ fileIndex: 0, sectionIndices: [0] }]} />)
    fireEvent.click(screen.getByText('Sources (1)'))
    expect(screen.getByText(/^A+…$/).textContent).toHaveLength(601)
  })

  it('renders nothing when there are no sources', () => {
    const { container } = render(<LessonSources files={files} sourceRefs={[]} />)
    expect(container.textContent).toBe('')
  })
})

describe('QuizReviewFlag', () => {
  it('shows the reviewer issue', () => {
    render(<QuizReviewFlag issue="Two answers fit." />)
    expect(screen.getByText('Check this question')).toBeTruthy()
    expect(screen.getByText('Two answers fit.')).toBeTruthy()
  })
})
