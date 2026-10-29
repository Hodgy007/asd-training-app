/**
 * One-time use for TOTP codes.
 *
 * `totp.validate({ window: 1 })` accepts the previous, current and next 30s
 * step, so a correct code stays valid for up to ~90 seconds. Without this, a
 * code seen over someone's shoulder (or replayed from an intercepted request)
 * could be used again inside that window. We remember each (user, step) pair
 * that has been accepted and refuse it a second time.
 *
 * Storage follows lib/rate-limit.ts: Upstash Redis when configured (shared
 * across Vercel instances), otherwise an in-memory map (per instance — fine
 * for local dev, best-effort in production). No database column needed.
 */

import { getRedis } from './rate-limit'

export const TOTP_PERIOD_SECONDS = 30

// Longer than the ~90s a code is accepted for, so a step can't expire from
// the store while its code is still valid.
const USED_STEP_TTL_MS = 3 * TOTP_PERIOD_SECONDS * 1000 + 30_000

const memory = new Map<string, number>() // key -> expiresAt (ms)

/** The TOTP step a code matched, given otpauth's `delta` at `timestamp`. */
export function matchedTotpStep(delta: number, timestamp: number): number {
  return Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS) + delta
}

/**
 * Record that `userId` has used the code for `step`. Returns false when that
 * code has already been used, in which case the caller must reject it.
 */
export async function claimTotpStep(userId: string, step: number): Promise<boolean> {
  const key = `totp-used:${userId}:${step}`

  const redis = getRedis()
  if (redis) {
    try {
      // SET NX: only the first caller for this key gets 'OK'.
      const result = await redis.set(key, '1', { nx: true, px: USED_STEP_TTL_MS })
      return result === 'OK'
    } catch (err) {
      // Same stance as the rate limiters: a Redis blip shouldn't lock every
      // admin out. Fall back to this instance's memory instead.
      console.error('[totp-replay] Upstash failed, using in-memory store:', err)
    }
  }

  const now = Date.now()
  for (const [k, expiresAt] of memory) {
    if (expiresAt <= now) memory.delete(k)
  }
  if ((memory.get(key) ?? 0) > now) return false
  memory.set(key, now + USED_STEP_TTL_MS)
  return true
}

/** Test helper: forget every remembered step. */
export function resetTotpReplayMemory(): void {
  memory.clear()
}
