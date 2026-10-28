import crypto from 'crypto'

/**
 * Reset tokens are stored hashed at rest. The raw token only ever exists in
 * the email link the user clicks; if the DB leaks, the SHA-256 digest in the
 * `PasswordResetToken.token` column is useless on its own (the token is
 * 32 bytes of CSPRNG output — there's nothing to brute-force).
 *
 * We deliberately use unsalted SHA-256 (not bcrypt) because (a) the token
 * is high-entropy by construction, (b) we look up by the digest in O(1), and
 * (c) lookup latency matters for the redeem path.
 */
/**
 * `PasswordResetToken.purpose` values. Every flow shares the one table, so
 * each redeem endpoint must check the purpose it expects — otherwise a
 * forgot-password link could be replayed against /api/auth/welcome, which
 * signs the user in.
 *   RESET      — forgot-password (/reset-password, no sign-in)
 *   ACTIVATION — admin-provisioned account (/reset-password, no sign-in)
 *   WELCOME    — magic-link self-registration (/welcome, signs the user in)
 */
export const TOKEN_PURPOSE = {
  RESET: 'RESET',
  ACTIVATION: 'ACTIVATION',
  WELCOME: 'WELCOME',
} as const

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}
