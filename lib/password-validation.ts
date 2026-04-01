/**
 * Shared password complexity validation.
 *
 * Requirements:
 *  - Minimum 10 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one number
 *  - At least one special character
 */

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters long.' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' }
  }

  if (!SPECIAL_CHARS.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:\',.<>?/).',
    }
  }

  return { valid: true }
}
