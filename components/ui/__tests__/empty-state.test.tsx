import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { FolderOpen } from 'lucide-react'
import { EmptyState } from '../empty-state'

afterEach(cleanup)

describe('EmptyState', () => {
  it('shows the heading, description and action link', () => {
    render(
      <EmptyState
        icon={FolderOpen}
        title="No documents yet"
        description="They'll appear here once they're shared with you."
        action={{ href: '/dashboard', label: 'Go to dashboard' }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No documents yet' })).toBeTruthy()
    expect(screen.getByText("They'll appear here once they're shared with you.")).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to dashboard' }).getAttribute('href')).toBe('/dashboard')
  })

  it('leaves out the button when there is nowhere to go', () => {
    render(<EmptyState icon={FolderOpen} title="Nothing matches your search" />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
