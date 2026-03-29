// middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not authenticated — redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string
  const mustChangePassword = token.mustChangePassword as boolean
  const mfaPending = token.mfaPending as boolean
  const totpEnabled = token.totpEnabled as boolean

  // Force password change
  if (mustChangePassword) {
    // Allow the change-password page and its API
    if (pathname === '/change-password' || pathname.startsWith('/api/auth/change-password')) {
      return NextResponse.next()
    }
    // Block other API routes with 403
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Password change required' }, { status: 403 })
    }
    // Redirect pages to change-password
    return NextResponse.redirect(new URL('/change-password', req.url))
  }

  // If on /change-password but doesn't need to change, redirect to home
  if (!mustChangePassword && pathname === '/change-password') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Force MFA verification for users with MFA enabled who haven't verified yet
  if (mfaPending) {
    if (pathname === '/mfa-verify' || pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'MFA verification required' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/mfa-verify', req.url))
  }

  // If on /mfa-verify but not pending, redirect to home
  if (!mfaPending && pathname === '/mfa-verify') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Force MFA setup for admin roles
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN'
  if (isAdmin && !totpEnabled && !mfaPending) {
    const allowedPaths = ['/mfa-setup', '/api/auth/mfa', '/api/auth']
    if (allowedPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'MFA setup required' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/mfa-setup', req.url))
  }

  // If on /mfa-setup but not required, redirect to home
  if (pathname === '/mfa-setup' && (!isAdmin || totpEnabled)) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Route protection: /super-admin/* — SUPER_ADMIN only
  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Route protection: /admin/* — ORG_ADMIN only
  if (pathname.startsWith('/admin') && role !== 'ORG_ADMIN') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // SUPER_ADMIN and ORG_ADMIN cannot access leaf-role routes
  if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') {
    const leafOnlyPaths = ['/dashboard', '/training', '/careers', '/children', '/reports', '/settings']
    if (leafOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL(homeForRole(role), req.url))
    }
  }

  // /children/* and /reports/* — CAREGIVER only
  if ((pathname.startsWith('/children') || pathname.startsWith('/reports')) && role !== 'CAREGIVER') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Post-login redirect: if landing on root /, redirect to role home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  return NextResponse.next()
}

function homeForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
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
