import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../card'

afterEach(cleanup)

describe('Card', () => {
  it('renders children inside a styled container', () => {
    render(<Card data-testid="card">hello</Card>)
    const el = screen.getByTestId('card')
    expect(el).toBeInTheDocument()
    expect(el.className).toContain('rounded-lg')
    expect(el.className).toContain('border')
    expect(el.textContent).toBe('hello')
  })

  it('merges a custom className', () => {
    render(
      <Card className="custom-x" data-testid="card">
        x
      </Card>,
    )
    expect(screen.getByTestId('card').className).toContain('custom-x')
  })

  it('composes header, title, body, footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
