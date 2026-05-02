/**
 * In-memory rate limiter for API routes.
 *
 * Note: On Vercel (serverless), each Lambda instance has its own memory,
 * so this is per-instance. It still prevents rapid-fire brute force within
 * a single instance and is far better than no rate limiting at all.
 * For stricter enforcement, swap to an Upstash Redis-based limiter.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

/**
 * Create a rate limiter with the given name, window (ms), and max requests.
 */
export function createRateLimiter(name: string, windowMs: number, maxRequests: number) {
  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  const store = stores.get(name)!

  // Lazy cleanup: expired entries are removed on access.
  // On serverless (Vercel), instances are short-lived so memory pressure is minimal.

  return {
    /**
     * Check if the key (usually IP) is rate-limited.
     * Returns { success: true } if allowed, { success: false, retryAfterMs } if blocked.
     */
    check(key: string): { success: true } | { success: false; retryAfterMs: number } {
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

// Pre-configured limiters for auth routes
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

// Backward-compatible simple API used by existing tests.
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
