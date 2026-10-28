// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { resolveLoginError, GENERIC_LOGIN_ERROR, NEXTAUTH_ERROR_MESSAGES } from '../login-errors'

const root = path.resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')

/** Every message the server sends to `/login?error=…`, scraped from source. */
function serverLoginErrorMessages(): string[] {
  const saml = read('app/api/auth/saml/callback/route.ts')
  const auth = read('lib/auth.ts')
  const messages = new Set<string>()
  for (const m of saml.matchAll(/loginError\(req, '([^']+)'\)/g)) messages.add(m[1])
  for (const src of [saml, auth]) {
    for (const m of src.matchAll(/\/login\?error=([^'`"&]+)['`"]/g)) {
      if (m[1].startsWith('${')) continue // loginError()'s own template, covered above
      messages.add(decodeURIComponent(m[1].replace(/\+/g, ' ')))
    }
  }
  return [...messages]
}

describe('resolveLoginError', () => {
  it('returns null when there is no error', () => {
    expect(resolveLoginError(null)).toBeNull()
    expect(resolveLoginError('')).toBeNull()
  })

  it('maps NextAuth codes to friendly copy', () => {
    expect(resolveLoginError('OAuthCallback')).toBe(NEXTAUTH_ERROR_MESSAGES.OAuthCallback)
    expect(resolveLoginError('AccessDenied')).toBe(NEXTAUTH_ERROR_MESSAGES.AccessDenied)
  })

  it('shows a generic line for text it does not recognise', () => {
    expect(resolveLoginError('Your account is locked. Call 0800 000 000 to unlock it.')).toBe(GENERIC_LOGIN_ERROR)
  })

  it('does not treat object prototype keys as codes', () => {
    expect(resolveLoginError('constructor')).toBe(GENERIC_LOGIN_ERROR)
    expect(resolveLoginError('__proto__')).toBe(GENERIC_LOGIN_ERROR)
  })

  it("passes through every message the app's own redirects send", () => {
    const messages = serverLoginErrorMessages()
    expect(messages.length).toBeGreaterThan(5)
    const unknown = messages.filter((m) => resolveLoginError(m) !== m)
    // If this fails, a new /login?error= message was added server-side:
    // add it to APP_LOGIN_ERRORS in lib/login-errors.ts.
    expect(unknown).toEqual([])
  })
})
