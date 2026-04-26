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

/**
 * Inject the SCORM API postMessage shim into the `<head>` of every served
 * HTML asset. The iframe is sandboxed without `allow-same-origin`, so the
 * SCO can't reach `window.parent.API` directly — the shim sets up
 * `window.API` / `window.API_1484_11` itself and relays calls to the parent
 * via postMessage.
 *
 * Rewriting is best-effort: if no `<head>` is present we fall back to
 * prepending the script tag, which still puts it ahead of any SCO scripts.
 */
function injectShim(html: string): string {
  const shimTag =
    '<script src="/scorm-runtime/api-shim.js"></script>'
  const headOpen = html.match(/<head[^>]*>/i)
  if (headOpen) {
    const idx = (headOpen.index ?? 0) + headOpen[0].length
    return html.slice(0, idx) + shimTag + html.slice(idx)
  }
  // No <head> at all (raw HTML fragment, etc.) — prepend.
  return shimTag + html
}

export async function GET(
  req: NextRequest,
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

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  const isHtml = /^text\/html\b/i.test(contentType)

  const headers = new Headers()
  headers.set('content-type', contentType)
  headers.set('cache-control', 'private, max-age=3600')

  // CSP for SCORM content. Note that with `allow-same-origin` removed from
  // the iframe sandbox, the document is treated as having an *opaque*
  // origin, which means `'self'` does NOT match subresources hosted on the
  // parent's actual domain. We therefore explicitly allow the parent's
  // origin (read from the request) for default-src/img-src/etc.
  const host = req.headers.get('host')
  const parentOrigin = host ? `https://${host}` : ''
  const allowSelf = `'self' ${parentOrigin}`.trim()
  headers.set(
    'content-security-policy',
    `default-src ${allowSelf} 'unsafe-inline' 'unsafe-eval' data: blob:; ` +
      `img-src ${allowSelf} data: blob:; ` +
      `media-src ${allowSelf} blob:; ` +
      `connect-src ${allowSelf}; ` +
      `frame-ancestors 'self'`,
  )

  if (isHtml) {
    // Read as text, inject the shim script, return rewritten HTML.
    const html = await upstream.text()
    const rewritten = injectShim(html)
    return new NextResponse(rewritten, { status: 200, headers })
  }

  // Buffer the full body before returning. Streaming upstream.body through
  // Next.js/Vercel's response pipeline is known to corrupt binary media —
  // see the comment in app/api/tts/route.ts. SCORM packages ship binary
  // assets (images, fonts, videos), so we match the TTS pattern.
  const bytes = new Uint8Array(await upstream.arrayBuffer())
  return new NextResponse(bytes, { status: 200, headers })
}
