import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScormPlayer } from '../scorm-player'

class FakeScorm2004API {
  on = vi.fn()
  renderCommitCMI = vi.fn(() => ({}))
  terminate = vi.fn()
}

vi.mock('scorm-again', () => ({
  Scorm2004API: FakeScorm2004API,
}))

describe('ScormPlayer', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('grants media permissions needed by embedded SCORM video players', async () => {
    render(
      <ScormPlayer
        lessonId="lesson-1"
        moduleId="module-1"
        entryPath="index.html"
        version="2004"
      />,
    )

    const iframe = await screen.findByTitle('SCORM content')
    await waitFor(() => expect(iframe).toHaveAttribute('src', '/api/scorm/lesson-1/index.html'))

    expect(iframe).toHaveAttribute(
      'allow',
      expect.stringContaining('autoplay'),
    )
    expect(iframe).toHaveAttribute(
      'allow',
      expect.stringContaining('fullscreen'),
    )
    expect(iframe).toHaveAttribute(
      'allow',
      expect.stringContaining('picture-in-picture'),
    )
    expect(iframe).toHaveAttribute(
      'allow',
      expect.stringContaining('encrypted-media'),
    )
    expect(iframe).toHaveAttribute('allowfullscreen')
    expect(iframe).toHaveAttribute(
      'sandbox',
      expect.stringContaining('allow-presentation'),
    )
  })
})
