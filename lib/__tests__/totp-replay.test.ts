// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/rate-limit', () => ({ getRedis: () => null }))

import { claimTotpStep, matchedTotpStep, resetTotpReplayMemory } from '../totp-replay'

beforeEach(() => {
  resetTotpReplayMemory()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('matchedTotpStep', () => {
  it('is the 30-second counter at the timestamp, shifted by delta', () => {
    const t = 1_800_000_000_000 // ms
    const step = Math.floor(t / 30_000)
    expect(matchedTotpStep(0, t)).toBe(step)
    expect(matchedTotpStep(-1, t)).toBe(step - 1)
    expect(matchedTotpStep(1, t)).toBe(step + 1)
  })
})

describe('claimTotpStep (in-memory fallback)', () => {
  it('allows a step once per user', async () => {
    expect(await claimTotpStep('u1', 100)).toBe(true)
    expect(await claimTotpStep('u1', 100)).toBe(false)
  })

  it('keeps users and steps independent', async () => {
    expect(await claimTotpStep('u1', 100)).toBe(true)
    expect(await claimTotpStep('u2', 100)).toBe(true)
    expect(await claimTotpStep('u1', 101)).toBe(true)
  })

  it('remembers a step for longer than the code stays valid, then forgets it', async () => {
    vi.useFakeTimers()
    expect(await claimTotpStep('u1', 100)).toBe(true)
    vi.advanceTimersByTime(90_000) // a window:1 code is valid for up to ~90s
    expect(await claimTotpStep('u1', 100)).toBe(false)
    vi.advanceTimersByTime(60_000)
    expect(await claimTotpStep('u1', 100)).toBe(true)
  })
})

describe('claimTotpStep (Upstash)', () => {
  it('uses SET NX with an expiry and treats a null reply as already used', async () => {
    vi.resetModules()
    const set = vi.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null)
    vi.doMock('@/lib/rate-limit', () => ({ getRedis: () => ({ set }) }))
    const mod = await import('../totp-replay')

    expect(await mod.claimTotpStep('u1', 200)).toBe(true)
    expect(await mod.claimTotpStep('u1', 200)).toBe(false)
    expect(set).toHaveBeenCalledWith('totp-used:u1:200', '1', { nx: true, px: expect.any(Number) })
    vi.doUnmock('@/lib/rate-limit')
  })
})
