/**
 * Higher-order handler that wraps a Next.js API route with authentication
 * and authorization checks. Cuts the auth boilerplate from ~178 routes down
 * to one line and standardises the error envelope.
 *
 * Usage:
 *
 *   // Any signed-in user
 *   export const GET = withAuth(async ({ session, req, params }) => { ... })
 *
 *   // Specific role(s)
 *   export const POST = withAuth(
 *     { role: 'ORG_ADMIN' },
 *     async ({ session, req }) => { ... }
 *   )
 *
 *   // Charity-level permission
 *   export const PATCH = withAuth(
 *     { permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
 *     async ({ session, req }) => { ... }
 *   )
 *
 *   // Custom check
 *   export const DELETE = withAuth(
 *     { check: (s) => isOrgAdmin(s) || isSuperAdmin(s) },
 *     async ({ session, req }) => { ... }
 *   )
 *
 * The handler MUST receive the wrapped session (`{ session, req, params }`)
 * — never call `getServerSession` again inside.
 *
 * Error envelope: `{ error: string }` with appropriate status (401 for not
 * signed in, 403 for insufficient role/permission). Standardise on this
 * shape across all wrapped routes; existing inconsistent shapes
 * (`{ message }`, plain text) will be migrated as routes are touched.
 */

import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, hasRole } from '@/lib/rbac'
import type { Role } from '@/types'
import type { CharityPermission } from '@/lib/rbac'

export interface AuthContext<P = Record<string, string>> {
  session: Session
  req: NextRequest
  params: P
}

export type AuthOptions =
  | { role: Role | Role[] }
  | { permission: CharityPermission }
  | { check: (session: Session) => boolean }
  | undefined

type RouteHandler<P> = (
  ctx: AuthContext<P>
) => Promise<NextResponse> | NextResponse

type RouteContext<P> = { params: P }

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Evaluate an AuthOptions guard against a session. Returns null if allowed,
 * or a NextResponse to short-circuit if denied.
 */
function evaluateGuard(session: Session | null, opts: AuthOptions): NextResponse | null {
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }
  if (!opts) return null

  if ('role' in opts) {
    const allowed = Array.isArray(opts.role) ? opts.role : [opts.role]
    if (!hasRole(session, ...allowed)) return jsonError('Forbidden', 403)
    return null
  }

  if ('permission' in opts) {
    if (!hasPermission(session, opts.permission)) return jsonError('Forbidden', 403)
    return null
  }

  if ('check' in opts) {
    if (!opts.check(session)) return jsonError('Forbidden', 403)
    return null
  }

  return null
}

// Two overloads so the optional `opts` argument can be omitted at the call
// site without losing type info on the handler's params.
export function withAuth<P = Record<string, string>>(
  handler: RouteHandler<P>
): (req: NextRequest, ctx: RouteContext<P>) => Promise<NextResponse>
export function withAuth<P = Record<string, string>>(
  opts: AuthOptions,
  handler: RouteHandler<P>
): (req: NextRequest, ctx: RouteContext<P>) => Promise<NextResponse>
export function withAuth<P = Record<string, string>>(
  optsOrHandler: AuthOptions | RouteHandler<P>,
  maybeHandler?: RouteHandler<P>
): (req: NextRequest, ctx: RouteContext<P>) => Promise<NextResponse> {
  const opts: AuthOptions = typeof optsOrHandler === 'function' ? undefined : optsOrHandler
  const handler: RouteHandler<P> = typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler!

  return async (req, ctx) => {
    const session = await getServerSession(authOptions)
    const guard = evaluateGuard(session, opts)
    if (guard) return guard
    return handler({
      session: session!,
      req,
      params: (ctx?.params ?? ({} as P)),
    })
  }
}
