import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Mail } from 'lucide-react'
import { IconTile } from '../icon-tile'

afterEach(cleanup)

describe('IconTile', () => {
  it('defaults to a medium primary tile with a matching icon size', () => {
    const { container } = render(<IconTile icon={Mail} />)
    const tile = container.firstElementChild as HTMLElement
    expect(tile.className).toContain('h-10 w-10 rounded-xl')
    expect(tile.className).toContain('bg-primary-100')
    expect(tile.getAttribute('aria-hidden')).toBe('true')
    expect(tile.querySelector('svg')?.getAttribute('class')).toContain('h-5 w-5')
  })

  it('scales the corner radius with size', () => {
    const { container } = render(<IconTile icon={Mail} size="xl" />)
    const tile = container.firstElementChild as HTMLElement
    expect(tile.className).toContain('h-14 w-14 rounded-2xl')
    expect(tile.querySelector('svg')?.getAttribute('class')).toContain('h-7 w-7')
  })

  it('applies the tone in light and dark mode', () => {
    const { container } = render(<IconTile icon={Mail} tone="danger" />)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('bg-red-100')
    expect(cls).toContain('text-red-600')
    expect(cls).toContain('dark:bg-red-900/30')
  })

  it('lets layout classes override the default display', () => {
    const { container } = render(<IconTile icon={Mail} className="inline-flex mx-auto" />)
    const cls = (container.firstElementChild as HTMLElement).className.split(' ')
    expect(cls).toContain('inline-flex')
    expect(cls).not.toContain('flex')
    expect(cls).toContain('mx-auto')
  })
})
