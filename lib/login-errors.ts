// Messages the login page may show for `/login?error=…`.
//
// The `error` query parameter is attacker-controllable: anyone can send a link
// to the real login page with their own wording in it. So the page only shows
// text from this allow-list and falls back to a generic line for anything else.
//
// NextAuth sends short codes (`OAuthCallback`, `AccessDenied`…); the SAML
// callback and the OAuth `signIn` callback in lib/auth.ts send the readable
// messages listed in APP_LOGIN_ERRORS. If you add a new redirect with a new
// message, add it here too or users will see the generic fallback.

export const NEXTAUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'Single Sign-On is not configured. Please sign in with email and password, or contact your administrator.',
  OAuthSignin: 'Could not start the sign-in process. Please try again.',
  OAuthCallback: 'Sign-in was interrupted. Please try again.',
  OAuthCreateAccount: 'Could not link your account. Please contact your administrator.',
  OAuthAccountNotLinked: 'This email is already linked to another sign-in method.',
  AccessDenied: 'Access denied. Your account may be deactivated.',
  Callback: 'Sign-in failed. Please try again.',
}

const APP_LOGIN_ERRORS = new Set([
  // lib/auth.ts (OAuth signIn callback)
  'Google sign-in is not enabled',
  'Microsoft sign-in is not enabled',
  // app/api/auth/saml/callback/route.ts, plus the OAuth callback
  'Account not found. Contact your organisation administrator.',
  'Invalid SAML response',
  'Invalid email in SAML response',
  'No charity SSO configuration found',
  'No SSO configuration found',
  'SSO authentication failed',
  'SSO response missing email',
  'No charity account found for this email',
  'This account is not a charity staff account',
  'SSO email domain does not match this organisation',
  'Your account has been deactivated. Please contact an administrator.',
  'Your organisation has been deactivated. Please contact an administrator.',
])

export const GENERIC_LOGIN_ERROR = 'Sign-in failed. Please try again.'

/** The text to show for a raw `?error=` value, or null when there isn't one. */
export function resolveLoginError(raw: string | null): string | null {
  if (!raw) return null
  if (Object.prototype.hasOwnProperty.call(NEXTAUTH_ERROR_MESSAGES, raw)) return NEXTAUTH_ERROR_MESSAGES[raw]
  if (APP_LOGIN_ERRORS.has(raw)) return raw
  return GENERIC_LOGIN_ERROR
}
