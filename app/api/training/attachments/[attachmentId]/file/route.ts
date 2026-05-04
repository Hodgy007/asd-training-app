import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCharityLevel } from '@/lib/rbac'

// Auth-gated proxy for lesson attachment downloads. The raw Vercel Blob
// URL never leaves the server — every request re-checks that the user has
// the lesson's program in their effectivePrograms (or is a charity-level
// previewer).
export async function GET(
  _req: NextRequest,
  { params }: { params: { attachmentId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const att = await prisma.lessonAttachment.findUnique({
    where: { id: params.attachmentId },
    select: {
      id: true,
      fileName: true,
      url: true,
      lesson: {
        select: {
          active: true,
          module: { select: { active: true, programId: true } },
        },
      },
    },
  })
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const charityLevel = isCharityLevel(session)
  if (!charityLevel) {
    if (!att.lesson.active || !att.lesson.module.active) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const programs = session.user.effectivePrograms ?? []
    if (!programs.some((p) => p.id === att.lesson.module.programId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const upstream = await fetch(att.url)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 })
  }

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  const safeName = att.fileName.replace(/[\r\n"]/g, '')
  headers.set('Content-Disposition', `attachment; filename="${safeName}"`)
  headers.set('Cache-Control', 'private, no-store')

  return new NextResponse(upstream.body, { status: 200, headers })
}
