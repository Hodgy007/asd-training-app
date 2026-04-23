import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { list } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function sanitiseSegments(segments: string[]): string | null {
  if (segments.length === 0) return null
  for (const seg of segments) {
    if (!seg || seg === '..' || seg.includes('\\')) return null
  }
  return segments.join('/')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { lessonId: string; path: string[] } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse('Unauthorised', { status: 401 })
  }

  const relPath = sanitiseSegments(params.path)
  if (!relPath) return new NextResponse('Bad path', { status: 400 })

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: { scormBlobPrefix: true },
  })
  if (!lesson?.scormBlobPrefix) {
    return new NextResponse('Not found', { status: 404 })
  }

  const fullPath = `${lesson.scormBlobPrefix}/${relPath}`

  // Resolve the public Blob URL via listing (prefix search).
  const { blobs } = await list({ prefix: fullPath })
  const match = blobs.find((b) => b.pathname === fullPath)
  if (!match) return new NextResponse('Not found', { status: 404 })

  const upstream = await fetch(match.url)
  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Blob fetch failed', { status: 502 })
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  headers.set('content-type', contentType)
  headers.set('cache-control', 'private, max-age=3600')
  // Restrictive CSP for SCORM content: no external scripts.
  headers.set(
    'content-security-policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
      "img-src 'self' data: blob:; media-src 'self' blob:; " +
      "connect-src 'self'; frame-ancestors 'self'",
  )

  return new NextResponse(upstream.body, { status: 200, headers })
}
