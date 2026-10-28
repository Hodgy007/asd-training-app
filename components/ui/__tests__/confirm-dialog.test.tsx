import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { ConfirmProvider, useConfirm, type ConfirmOptions } from '../confirm-dialog'

afterEach(cleanup)

function Harness({ options }: { options: ConfirmOptions }) {
  const confirmAction = useConfirm()
  const [result, setResult] = useState<string>('pending')
  return (
    <>
      <button onClick={async () => setResult(String(await confirmAction(options)))}>Delete thing</button>
      <output>{result}</output>
    </>
  )
}

function renderHarness(options: ConfirmOptions) {
  return render(
    <ConfirmProvider>
      <Harness options={options} />
    </ConfirmProvider>,
  )
}

describe('useConfirm', () => {
  it('opens an alert dialog with the title, description and labels', async () => {
    const user = userEvent.setup()
    renderHarness({ title: 'Delete "Intro"?', description: 'This cannot be undone.', confirmLabel: 'Delete' })
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveAccessibleName('Delete "Intro"?')
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('starts focus on Cancel so Enter never confirms by accident', async () => {
    const user = userEvent.setup()
    renderHarness({ title: 'Remove?', tone: 'danger' })
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    await screen.findByRole('alertdialog')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())
  })

  it('resolves true when confirmed', async () => {
    const user = userEvent.setup()
    renderHarness({ title: 'Remove?', confirmLabel: 'Remove' })
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('true'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resolves false when cancelled', async () => {
    const user = userEvent.setup()
    renderHarness({ title: 'Remove?' })
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('false'))
  })

  it('resolves false when dismissed with Escape', async () => {
    const user = userEvent.setup()
    renderHarness({ title: 'Remove?' })
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('false'))
  })

  it('styles the confirm button red for danger tone', async () => {
    const user = userEvent.setup()
    renderHarness({ title: 'Remove?', confirmLabel: 'Remove', tone: 'danger' })
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    expect((await screen.findByRole('button', { name: 'Remove' })).className).toContain('bg-red-600')
  })

  it('throws a helpful error outside the provider', () => {
    function Orphan() {
      useConfirm()
      return null
    }
    // React and jsdom both report the thrown render error; keep the output clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const swallow = (e: ErrorEvent) => e.preventDefault()
    window.addEventListener('error', swallow)
    expect(() => render(<Orphan />)).toThrow(/ConfirmProvider/)
    window.removeEventListener('error', swallow)
    spy.mockRestore()
  })
})
