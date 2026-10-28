import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog'
import { Modal } from '../modal'

afterEach(cleanup)

function renderDialog(props: Partial<React.ComponentProps<typeof DialogContent>> = {}, onOpenChange = vi.fn()) {
  render(
    <>
      <button>Behind</button>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent {...props}>
          <DialogTitle>Edit block</DialogTitle>
          <DialogDescription>Change the block settings.</DialogDescription>
          <input aria-label="Name" />
        </DialogContent>
      </Dialog>
    </>,
  )
  return onOpenChange
}

describe('Dialog', () => {
  it('renders an accessible modal dialog', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Edit block')
    expect(dialog).toHaveAccessibleDescription('Change the block settings.')
  })

  it('renders the dimmed overlay by default', () => {
    renderDialog()
    expect(document.querySelector('.dialog-overlay')).not.toBeNull()
  })

  it('omits the overlay for the no-backdrop action modals', () => {
    renderDialog({ overlay: false })
    expect(document.querySelector('.dialog-overlay')).toBeNull()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = renderDialog()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes via the built-in close button', async () => {
    const user = userEvent.setup()
    const onOpenChange = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('can hide the built-in close button', () => {
    renderDialog({ showClose: false })
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('ignores outside clicks when dismissOnOutsideClick is false', () => {
    const onOpenChange = renderDialog({ dismissOnOutsideClick: false })
    fireEvent.pointerDown(document.body)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('lets later classes override the default width', () => {
    renderDialog({ className: 'max-w-sm' })
    const cls = screen.getByRole('dialog').className
    expect(cls).toContain('max-w-sm')
    expect(cls).not.toContain('max-w-md')
  })
})

describe('Modal', () => {
  it('renders title and description through the Radix dialog', async () => {
    render(
      <Modal isOpen onClose={() => {}} title="Credentials" description="Print or email them.">
        <p>Body</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Credentials')
    expect(dialog).toHaveAccessibleDescription('Print or email them.')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })

  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
