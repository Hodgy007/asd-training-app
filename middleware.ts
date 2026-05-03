// middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/register-organisation', '/privacy', '/terms', '/api/auth', '/api/organisations/register', '/api/cron', '/courses', '/toolkit', '/api/toolkit', '/api/checkout/session', '/api/stripe/webhook', '/api/courses/free-claim', '/join', '/api/join']

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

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
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
    if (pathname === '/mfa-verify' || pathname.startsWith('/api/auth')) {
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
    if (allowedPaths.some((p) => pathname.startsWith(p))) {
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

  // Charity-level, ORG_ADMIN cannot access leaf-role routes (except training/careers/CV/advisor preview for charity-level users).
  // Charity admins use /cv-builder and /careers-advisor to self-test the tools — they only ever see their own data.
  if (role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE' || role === 'ORG_ADMIN') {
    const previewPaths = ['/training', '/careers', '/cv-builder', '/careers-advisor']
    const isPreview = (role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE') && previewPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!isPreview) {
      const leafOnlyPaths = ['/dashboard', '/training', '/careers', '/settings', '/guide', '/careers-advisor', '/cv-builder', '/students']
      if (leafOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return redirect(new URL(homeForRole(role), req.url), 'role_blocked_leaf_only', { userId, role })
      }
    }
  }

  // /students/* — CAREER_DEV_OFFICER only (within leaf roles)
  if (pathname.startsWith('/students') && role !== 'CAREER_DEV_OFFICER') {
    return redirect(new URL(homeForRole(role), req.url), 'role_blocked_students', { userId, role })
  }

  // PARTICIPANT — workshop attendees get a stripped-back surface. They join via
  // an invite link and don't have access to the careers tooling or formal
  // training-program management features that other leaf roles see.
  if (role === 'PARTICIPANT') {
    const blockedForParticipant = ['/cv-builder', '/careers-advisor', '/jobs', '/students', '/careers']
    if (blockedForParticipant.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return redirect(new URL(homeForRole(role), req.url), 'role_blocked_participant', { userId })
    }
  }

  // PARTICIPANT — workshop attendees get a stripped-back surface. They join via
  // an invite link and don't have access to the careers tooling or formal
  // training-program management features that other leaf roles see.
  if (role === 'PARTICIPANT') {
    const blockedForParticipant = ['/cv-builder', '/careers-advisor', '/jobs', '/students', '/careers']
    if (blockedForParticipant.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL(homeForRole(role), req.url))
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
