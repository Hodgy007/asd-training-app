// middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/register', '/register-organisation', '/welcome', '/privacy', '/terms', '/api/auth', '/api/organisations/register', '/api/organisations/public', '/api/cron', '/courses', '/toolkit', '/api/toolkit', '/api/checkout/session', '/api/stripe/webhook', '/api/webhooks', '/api/courses/free-claim', '/join', '/api/join', '/api/integrations']
// `/api/integrations/*` is Bearer-token authenticated inside the route via
// `validateApiKey` (SHA-256 hashed key + rate-limited per key). It's listed
// here so the middleware doesn't redirect external Bearer clients to /login
// before the route's own auth has a chance to run.

// Temporary MFA kill-switch. Set `DISABLE_MFA=true` in env to skip all MFA
// enforcement (verify + setup). Existing TOTP secrets remain intact; users
// simply aren't forced through the flow. Remove the env var (or set to anything
// other than "true") to re-enable MFA.
const MFA_DISABLED = process.env.DISABLE_MFA === 'true'

const REQUEST_ID_HEADER = 'x-request-id'

function logEvent(level: 'info' | 'warn', msg: string, meta: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
    component: 'middleware',
    ...meta,
  })
  if (level === 'warn') console.warn(line)
  else console.log(line)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const incomingId = req.headers.get(REQUEST_ID_HEADER)
  const requestId = incomingId && incomingId.length > 0 ? incomingId : crypto.randomUUID()

  // Propagate request id on the request itself so downstream handlers can read it.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const passThrough = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set(REQUEST_ID_HEADER, requestId)
    return res
  }

  const redirect = (url: URL, reason: string, extra: Record<string, unknown> = {}) => {
    logEvent('info', 'middleware.redirect', { requestId, pathname, target: url.pathname, reason, ...extra })
    const res = NextResponse.redirect(url)
    res.headers.set(REQUEST_ID_HEADER, requestId)
    return res
  }

  const blockApi = (status: number, error: string, reason: string) => {
    logEvent('warn', 'middleware.block', { requestId, pathname, status, reason })
    const res = NextResponse.json({ error }, { status })
    res.headers.set(REQUEST_ID_HEADER, requestId)
    return res
  }

  // Allow public paths. Match exactly or as a path-segment prefix (with a
  // trailing slash) so `/login` doesn't accidentally also unauth-allow
  // `/login-evil-page` or `/api/auth` doesn't allow `/api/authorisation`.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return passThrough()
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return passThrough()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not authenticated — redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return redirect(loginUrl, 'unauthenticated')
  }

  const role = token.role as string
  const userId = token.id as string | undefined
  const mustChangePassword = token.mustChangePassword as boolean
  const mfaPending = token.mfaPending as boolean
  const totpEnabled = token.totpEnabled as boolean

  // Force password change
  if (mustChangePassword) {
    // Allow the change-password page and its API
    if (pathname === '/change-password' || pathname.startsWith('/api/auth/change-password')) {
      return passThrough()
    }
    // Block other API routes with 403
    if (pathname.startsWith('/api/')) {
      return blockApi(403, 'Password change required', 'must_change_password')
    }
    // Redirect pages to change-password
    return redirect(new URL('/change-password', req.url), 'must_change_password', { userId })
  }

  // If on /change-password but doesn't need to change, redirect to home
  if (!mustChangePassword && pathname === '/change-password') {
    return redirect(new URL(homeForRole(role), req.url), 'no_password_change_required', { userId, role })
  }

  // Force MFA verification for users with MFA enabled who haven't verified yet
  if (!MFA_DISABLED && mfaPending) {
    // Path-segment prefix only — `pathname.startsWith('/api/auth')` alone
    // would also let through a future `/api/authorise…` route.
    if (pathname === '/mfa-verify' || pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
      return passThrough()
    }
    if (pathname.startsWith('/api/')) {
      return blockApi(403, 'MFA verification required', 'mfa_pending')
    }
    return redirect(new URL('/mfa-verify', req.url), 'mfa_pending', { userId })
  }

  // If on /mfa-verify but not pending, redirect to home
  if (!mfaPending && pathname === '/mfa-verify') {
    return redirect(new URL(homeForRole(role), req.url), 'mfa_already_verified', { userId, role })
  }

  // Force MFA setup for admin roles
  const isAdmin = role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE' || role === 'ORG_ADMIN'
  if (!MFA_DISABLED && isAdmin && !totpEnabled && !mfaPending) {
    const allowedPaths = ['/mfa-setup', '/api/auth/mfa', '/api/auth']
    if (allowedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return passThrough()
    }
    if (pathname.startsWith('/api/')) {
      return blockApi(403, 'MFA setup required', 'mfa_setup_required')
    }
    return redirect(new URL('/mfa-setup', req.url), 'mfa_setup_required', { userId, role })
  }

  // If on /mfa-setup but not required, redirect to home
  if (pathname === '/mfa-setup' && (MFA_DISABLED || !isAdmin || totpEnabled)) {
    return redirect(new URL(homeForRole(role), req.url), 'mfa_setup_not_required', { userId, role })
  }

  // Route protection: /super-admin/* — SUPER_ADMIN and CHARITY_EMPLOYEE
  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN' && role !== 'CHARITY_EMPLOYEE') {
    return redirect(new URL(homeForRole(role), req.url), 'role_blocked_super_admin', { userId, role })
  }

  // Route protection: /admin/* — ORG_ADMIN only
  if (pathname.startsWith('/admin') && role !== 'ORG_ADMIN') {
    return redirect(new URL(homeForRole(role), req.url), 'role_blocked_admin', { userId, role })
  }

  // Charity-level and ORG_ADMIN users cannot access learner routes, except that
  // charity-level users may preview training and the library as a learner sees them.
  //
  // The per-role carve-outs that used to live here (PARTICIPANT and FAMILY_CARER
  // stripped-back surfaces, /students for careers officers) are gone with those
  // roles. A learner's surface is now determined by their organisation's assigned
  // programmes, not by branching on their role.
  if (role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE' || role === 'ORG_ADMIN') {
    const previewPaths = ['/training', '/careers', '/library']
    const isPreview = (role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE') && previewPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!isPreview) {
      const leafOnlyPaths = ['/dashboard', '/training', '/careers', '/settings', '/guide']
      if (leafOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return redirect(new URL(homeForRole(role), req.url), 'role_blocked_leaf_only', { userId, role })
      }
    }
  }

  // Post-login redirect: if landing on root /, redirect to role home
  if (pathname === '/') {
    return redirect(new URL(homeForRole(role), req.url), 'root_to_home', { userId, role })
  }

  return passThrough()
}

function homeForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'CHARITY_EMPLOYEE':
      return '/super-admin'
    case 'ORG_ADMIN':
      return '/admin'
    default:
      return '/dashboard'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
