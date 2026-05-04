import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

// Auth-gated proxy for library document downloads.
//
// Vercel Blob URLs are world-readable forever once the URL leaks (browser
// history, share links, log lines). To keep document access tied to the
// user's current entitlement, the raw blob URL never leaves the server —
// listing endpoints return /api/library/documents/[docId]/file and this
// route streams the bytes after re-checking targeting on every request.
export async function GET(
  _req: NextRequest,
  { params }: { params: { docId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  // original name rather than a Blob hash.
  const safeName = doc.fileName.replace(/[\r\n"]/g, '')
  headers.set('Content-Disposition', `attachment; filename="${safeName}"`)
  headers.set('Cache-Control', 'private, no-store')

  return new NextResponse(upstream.body, { status: 200, headers })
}
