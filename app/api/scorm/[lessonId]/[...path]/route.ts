import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { head } from '@vercel/blob'
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

  let blobUrl: string
  try {
    const metadata = await head(fullPath)
    blobUrl = metadata.url
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  const upstream = await fetch(blobUrl)
  if (!upstream.ok) {
    return new NextResponse('Blob fetch failed', { status: 502 })
  }

  // Buffer the full body before returning. Streaming upstream.body through
  // Next.js/Vercel's response pipeline is known to corrupt binary media —
  // see the comment in app/api/tts/route.ts. SCORM packages ship binary
  // assets (images, fonts, videos), so we match the TTS pattern.
  const bytes = new Uint8Array(await upstream.arrayBuffer())

  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  headers.set('content-type', contentType)
  headers.set('cache-control', 'private, max-age=3600')
  // Stop browsers from sniffing a `text/plain` SCO file as HTML and executing
  // it; combined with allow-same-origin on the iframe, sniffing widens XSS.
  headers.set('x-content-type-options', 'nosniff')
  // Restrictive CSP for SCORM content: no external scripts.
  headers.set(
    'content-security-policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
      "img-src 'self' data: blob:; media-src 'self' blob:; " +
      "connect-src 'self'; frame-ancestors 'self'",
  )

  return new NextResponse(bytes, { status: 200, headers })
}
