import { describe, it, expect, vi, beforeEach } from 'vitest'

const success = vi.fn()
const error = vi.fn()
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => success(...a), error: (...a: unknown[]) => error(...a) },
  Toaster: () => null,
}))

import { showToast } from '../toaster'

beforeEach(() => {
  success.mockReset()
  error.mockReset()
})

describe('showToast', () => {
  it('routes success messages to toast.success', () => {
    showToast('Saved.', 'success')
    expect(success).toHaveBeenCalledWith('Saved.')
    expect(error).not.toHaveBeenCalled()
  })

  it('routes error messages to toast.error', () => {
    showToast('Delete failed.', 'error')
    expect(error).toHaveBeenCalledWith('Delete failed.')
    expect(success).not.toHaveBeenCalled()
  })

  it('defaults to success', () => {
    showToast('Done.')
    expect(success).toHaveBeenCalledWith('Done.')
  })
})
