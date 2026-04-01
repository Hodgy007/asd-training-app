import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to re-import the module fresh for some tests because it uses module-level state.
// For most tests, a shared import is fine since we use unique keys.
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request for a new key', () => {
    const result = rateLimit('test-first-request', 5, 60_000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('allows requests up to the limit', () => {
    const key = 'test-up-to-limit'
    const limit = 3
    const window = 60_000

    const r1 = rateLimit(key, limit, window)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(key, limit, window)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit(key, limit, window)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests after the limit is exceeded', () => {
    const key = 'test-blocks-excess'
    const limit = 2
    const window = 60_000

    rateLimit(key, limit, window) // 1
    rateLimit(key, limit, window) // 2

    const blocked = rateLimit(key, limit, window)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)

    // Subsequent requests are also blocked
    const blocked2 = rateLimit(key, limit, window)
    expect(blocked2.success).toBe(false)
    expect(blocked2.remaining).toBe(0)
  })

  it('treats different keys independently', () => {
    const limit = 2
    const window = 60_000

    // Exhaust key A
    rateLimit('key-a-independent', limit, window)
    rateLimit('key-a-independent', limit, window)
    const blockedA = rateLimit('key-a-independent', limit, window)
    expect(blockedA.success).toBe(false)

    // Key B should still work
    const resultB = rateLimit('key-b-independent', limit, window)
    expect(resultB.success).toBe(true)
    expect(resultB.remaining).toBe(1)
  })

  it('resets after the window expires', () => {
    const key = 'test-window-expiry'
    const limit = 2
    const window = 10_000 // 10 seconds

    // Exhaust the limit
    rateLimit(key, limit, window)
    rateLimit(key, limit, window)
    const blocked = rateLimit(key, limit, window)
    expect(blocked.success).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(10_001)

    // Should be allowed again
    const result = rateLimit(key, limit, window)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('does not reset before the window expires', () => {
    const key = 'test-no-early-reset'
    const limit = 2
    const window = 10_000

    rateLimit(key, limit, window)
    rateLimit(key, limit, window)

    // Advance time but not past the window
    vi.advanceTimersByTime(9_999)

    const result = rateLimit(key, limit, window)
    expect(result.success).toBe(false)
  })

  it('handles a limit of 1 (single request per window)', () => {
    const key = 'test-limit-one'
    const limit = 1
    const window = 5_000

    const r1 = rateLimit(key, limit, window)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(0)

    const r2 = rateLimit(key, limit, window)
    expect(r2.success).toBe(false)
    expect(r2.remaining).toBe(0)

    // After window expires
    vi.advanceTimersByTime(5_001)
    const r3 = rateLimit(key, limit, window)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('correctly counts remaining requests', () => {
    const key = 'test-remaining-count'
    const limit = 5
    const window = 60_000

    expect(rateLimit(key, limit, window).remaining).toBe(4)
    expect(rateLimit(key, limit, window).remaining).toBe(3)
    expect(rateLimit(key, limit, window).remaining).toBe(2)
    expect(rateLimit(key, limit, window).remaining).toBe(1)
    expect(rateLimit(key, limit, window).remaining).toBe(0)
    expect(rateLimit(key, limit, window).remaining).toBe(0) // Blocked, still 0
  })

  it('each window starts a fresh counter after expiry', () => {
    const key = 'test-fresh-counter'
    const limit = 3
    const window = 5_000

    // First window: use 2 of 3
    rateLimit(key, limit, window)
    rateLimit(key, limit, window)

    // Expire the window
    vi.advanceTimersByTime(5_001)

    // Second window: should have full limit again
    const r1 = rateLimit(key, limit, window)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(key, limit, window)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)
  })
})
