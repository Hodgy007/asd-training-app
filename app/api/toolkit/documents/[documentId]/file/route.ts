import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getToolkitRegistrant } from '@/lib/toolkit-session'
import { recordToolkitDocumentEvent } from '@/lib/toolkit'

const INLINE_VIEWABLE_PREFIXES = ['application/pdf', 'image/', 'video/', 'audio/', 'text/']

function isInlineViewable(fileType: string | null | undefined): boolean {
  if (!fileType) return false
  return INLINE_VIEWABLE_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? fileType.startsWith(prefix) : fileType === prefix,
  )
}

// Public Vercel Blob URLs are world-readable forever once leaked, so the
// raw fileUrl never leaves the server. Three-way auth: a NextAuth session
// (any role) OR a verified toolkit-session cookie OR rejection.
export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const session = await getServerSession(authOptions)
  const registrant = session?.user?.id ? null : await getToolkitRegistrant()

  if (!session?.user?.id && !registrant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wantsInline = req.nextUrl.searchParams.get('disposition') === 'inline'

  const doc = await prisma.libraryDocument.findFirst({
    where: {
      id: params.documentId,
      active: true,
      collection: { active: true, publishedToToolkit: true },
    },
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
      fileType: true,
    },
  })
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const upstream = await fetch(doc.fileUrl)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 })
  }

  // Best-effort event recording. Do this BEFORE buffering so that even if
  // the buffer fails, we've captured intent. Errors are swallowed because
  // tracking shouldn't block downloads.
  void (async () => {
    try {
      await recordToolkitDocumentEvent(prisma, {
        documentId: doc.id,
        action: wantsInline ? 'view' : 'download',
        user: session?.user?.id
          ? { id: session.user.id, organisationId: session.user.organisationId ?? null }
          : null,
        registrantId: registrant?.id ?? null,
      })
    } catch (err) {
      console.error('[toolkit file] event recording failed:', err)
    }
  })()

  // Buffer the body before responding — streaming through Next responses
  // has caused media corruption in this codebase (see /api/tts).
  const buf = Buffer.from(await upstream.arrayBuffer())

  const headers = new Headers()
  headers.set('Content-Type', doc.fileType || upstream.headers.get('content-type') || 'application/octet-stream')
  headers.set('Content-Length', String(buf.byteLength))
  const safeName = doc.fileName.replace(/[\r\n"]/g, '')
  const disposition = wantsInline && isInlineViewable(doc.fileType) ? 'inline' : 'attachment'
  headers.set('Content-Disposition', `${disposition}; filename="${safeName}"`)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new NextResponse(buf, { status: 200, headers })
}
