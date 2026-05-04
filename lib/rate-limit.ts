/**
 * Rate limiter for API routes.
 *
 * Two backends:
 *   - Upstash Redis (preferred for production) — cross-instance enforcement.
 *     Activated when both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 *     are present. Provision via the Vercel Marketplace integration.
 *   - In-memory Map (fallback) — per-instance only. Useful for local dev or
 *     when Upstash is unavailable. Documented behaviour: on Vercel each warm
 *     Lambda has its own counter, so the effective limit scales with the
 *     active instance count. Better than no rate limiting at all but not a
 *     defence against a determined attacker rotating across instances.
 *
 * Existing call sites (`limiter.check(key)`) work unchanged — the adapter
 * keeps the same return shape (`{ success } | { success, retryAfterMs }`),
 * but the call is now async because the Upstash backend hits Redis.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitResult =
  | { success: true }
  | { success: false; retryAfterMs: number }

export interface Limiter {
  check(key: string): Promise<RateLimitResult>
}

// ─── Upstash backend ──────────────────────────────────────────────────────────

let cachedRedis: Redis | null | undefined

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    cachedRedis = null
    return null
  }
  cachedRedis = new Redis({ url, token })
  return cachedRedis
}

function createUpstashLimiter(name: string, windowMs: number, maxRequests: number): Limiter {
  const redis = getRedis()
  if (!redis) throw new Error('Upstash redis not configured')
  // Sliding window — accurate across distributed instances and avoids the
  // burst-at-window-boundary problem of fixed window.
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
    analytics: false,
    prefix: `rl:${name}`,
  })
  return {
    async check(key: string): Promise<RateLimitResult> {
      try {
        const result = await limiter.limit(key)
        if (result.success) return { success: true }
        const retryAfterMs = Math.max(0, result.reset - Date.now())
        return { success: false, retryAfterMs }
      } catch (err) {
        // If Upstash itself fails (network blip, region down) we don't want
        // to block all sign-ins — fail open and log. The in-memory backstop
        // would also let everything through in this scenario; an attacker
        // can't actually exploit a transient network failure to bypass rate
        // limits at scale.
        console.error('[rate-limit] Upstash failed, allowing request:', err)
        return { success: true }
      }
    },
  }
}

// ─── In-memory backend ────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function createMemoryLimiter(name: string, windowMs: number, maxRequests: number): Limiter {
  if (!stores.has(name)) stores.set(name, new Map())
  const store = stores.get(name)!

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now()
      const entry = store.get(key)
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { success: true }
      }
      entry.count++
      if (entry.count > maxRequests) {
        return { success: false, retryAfterMs: entry.resetAt - now }
      }
      return { success: true }
    },
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a rate limiter with the given name, window (ms), and max requests.
 * Backend is chosen at module import time based on env vars.
 */
export function createRateLimiter(name: string, windowMs: number, maxRequests: number): Limiter {
  if (getRedis()) return createUpstashLimiter(name, windowMs, maxRequests)
  return createMemoryLimiter(name, windowMs, maxRequests)
}

// ─── Pre-configured limiters for auth routes ──────────────────────────────────

// Login: 10 attempts per 15 minutes per IP
export const loginLimiter = createRateLimiter('login', 15 * 60 * 1000, 10)

// Forgot password: 5 requests per 15 minutes per IP
export const forgotPasswordLimiter = createRateLimiter('forgot-password', 15 * 60 * 1000, 5)

// Reset password: 5 attempts per 15 minutes per IP
export const resetPasswordLimiter = createRateLimiter('reset-password', 15 * 60 * 1000, 5)

// MFA verify: 5 attempts per 5 minutes per IP (tighter window for OTP brute force)
export const mfaVerifyLimiter = createRateLimiter('mfa-verify', 5 * 60 * 1000, 5)

// Change password: 5 attempts per 15 minutes per IP
export const changePasswordLimiter = createRateLimiter('change-password', 15 * 60 * 1000, 5)

// Invite send: 20 per hour per admin
export const inviteLimiter = createRateLimiter('invite', 60 * 60 * 1000, 20)

// Feedback submit: 5 per 15 minutes per user
export const feedbackLimiter = createRateLimiter('feedback', 15 * 60 * 1000, 5)

// Reset-password token introspect: 20 per 5 minutes per IP
export const introspectLimiter = createRateLimiter('introspect', 5 * 60 * 1000, 20)

// Cohort join: 10 per 15 minutes per IP — public, so a real ceiling matters
export const joinLimiter = createRateLimiter('cohort-join', 15 * 60 * 1000, 10)

// ─── Backward-compat: simple sync API used by legacy tests ────────────────────

const simpleStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = simpleStore.get(key)

  if (!entry || now > entry.resetAt) {
    simpleStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count }
}

/**
 * Extract client IP from a NextRequest.
 * Prefers x-forwarded-for (set by Vercel/proxies), falls back to a default.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return '127.0.0.1'
}
