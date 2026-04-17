import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Button } from '../button'

afterEach(cleanup)

describe('Button', () => {
  it('renders as a button by default', () => {
    render(<Button>click</Button>)
    const btn = screen.getByRole('button', { name: 'click' })
    expect(btn.tagName).toBe('BUTTON')
  })

  it('applies primary variant classes by default', () => {
    render(<Button>x</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-primary-500')
    expect(btn.className).toContain('text-white')
    expect(btn.className).toContain('rounded-full')
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">x</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('border')
  })

  it('applies tertiary variant classes', () => {
    render(<Button variant="tertiary">x</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-primary-600')
    expect(btn.className).not.toContain('rounded-full')
  })

  it('applies sm size padding', () => {
    render(<Button size="sm">x</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-4')
    expect(btn.className).toContain('py-1.5')
  })

  it('fires onClick', async () => {
    const fn = vi.fn()
    render(<Button onClick={fn}>x</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledOnce()
  })
})
