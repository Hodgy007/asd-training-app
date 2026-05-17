import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'

// Pin Node runtime + a generous timeout so a 50 MB attachment to a learner
// on a slow connection isn't cut off mid-stream by the platform default.
export const runtime = 'nodejs'
export const maxDuration = 300

// 30 downloads / minute / user. Generous enough for a real session with
// multiple tabs / resumed downloads, tight enough to stop a runaway client
// from hammering Blob egress.
const downloadLimiter = createRateLimiter('library-download', 60_000, 30)

// Auth-gated proxy for library document downloads.
//
// Vercel Blob URLs are world-readable forever once the URL leaks (browser
// history, share links, log lines). To keep document access tied to the
// user's current entitlement, the raw blob URL never leaves the server —
// listing endpoints return /api/library/documents/[docId]/file and this
// route streams the bytes after re-checking targeting on every request.
// File types the browser can render natively. Anything outside this list
// falls back to attachment so a missing native renderer doesn't show the
// user a screenful of binary garbage.
const INLINE_VIEWABLE_PREFIXES = ['application/pdf', 'image/', 'video/', 'audio/', 'text/']

function isInlineViewable(fileType: string | null | undefined): boolean {
  if (!fileType) return false
  return INLINE_VIEWABLE_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? fileType.startsWith(prefix) : fileType === prefix,
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: { docId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Per-user rate limit applied after auth so unauthenticated traffic can't
  // probe the limiter's response. Keyed on user id (not IP) so a shared NAT
  // doesn't penalise legitimate users in the same household / school.
  const rate = await downloadLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many download requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const wantsInline = req.nextUrl.searchParams.get('disposition') === 'inline'

  const userRole = session.user.role
  const userOrgId = session.user.organisationId
  const isPreview = userRole === 'SUPER_ADMIN' || userRole === 'CHARITY_EMPLOYEE'
  const canManage = hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)

  const doc = await prisma.libraryDocument.findUnique({
    where: { id: params.docId },
    select: {
      id: true,
      active: true,
      fileUrl: true,
      fileName: true,
      fileType: true,
      collection: {
        select: { active: true, targetOrgIds: true, targetRoles: true },
      },
    },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Library managers can preview drafts/inactive content. Everyone else
  // must hit an active doc in an active collection that targets them.
  if (!canManage) {
    if (!doc.active || !doc.collection.active) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!isPreview) {
      const orgOk =
        doc.collection.targetOrgIds.length === 0 ||
        (userOrgId ? doc.collection.targetOrgIds.includes(userOrgId) : false)
      const roleOk =
        doc.collection.targetRoles.length === 0 ||
        (userRole ? doc.collection.targetRoles.includes(userRole) : false)
      if (!orgOk || !roleOk) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }
  }

  const upstream = await fetch(doc.fileUrl)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 })
  }

  const headers = new Headers()
  headers.set('Content-Type', doc.fileType || upstream.headers.get('content-type') || 'application/octet-stream')
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  // Use attachment + sanitised filename so the browser saves under the
  // original name rather than a Blob hash. Switch to inline only when the
  // caller asked for it AND the file type is something the browser can
  // safely render — never inline unknown binaries.
  const safeName = doc.fileName.replace(/[\r\n"]/g, '')
  const disposition = wantsInline && isInlineViewable(doc.fileType) ? 'inline' : 'attachment'
  headers.set('Content-Disposition', `${disposition}; filename="${safeName}"`)
  headers.set('Cache-Control', 'private, no-store')
  // X-Content-Type-Options stops the browser sniffing past our type
  // declaration — important for inline rendering.
  headers.set('X-Content-Type-Options', 'nosniff')

  return new NextResponse(upstream.body, { status: 200, headers })
}
