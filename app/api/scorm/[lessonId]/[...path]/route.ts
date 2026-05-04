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

interface ByteRange {
  start: number
  end: number
}

const CAPTIVATE_RUNTIME_FALLBACKS = new Set([
  'answer_checkbox_hover.png',
  'checkbox_normal.png',
  'checkbox_selected.png',
  'expand_icon.png',
  'hotspotquestionoverlays.png',
  'radiochecked.png',
  'radiounchecked.png',
  'threed_hotspotdefaultglow.png',
  'threed_hotspotglow.png',
  'vr_move_left.png',
  'assessmenthotspotvisited.svg',
])

function parseRangeHeader(rangeHeader: string | null, size: number): ByteRange | null | 'invalid' {
  if (!rangeHeader) return null
  if (!Number.isFinite(size) || size <= 0) return 'invalid'

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match) return 'invalid'

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return 'invalid'

  let start: number
  let end: number

  if (rawStart === '') {
    const suffixLength = Number(rawEnd)
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return 'invalid'
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number(rawStart)
    if (!Number.isSafeInteger(start) || start < 0) return 'invalid'
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
    if (!Number.isSafeInteger(end) || end < start) return 'invalid'
    end = Math.min(end, size - 1)
  }

  if (start >= size) return 'invalid'
  return { start, end }
}

function buildScormHeaders(contentType: string): Headers {
  const headers = new Headers()
  headers.set('content-type', contentType)
  headers.set('cache-control', 'private, max-age=3600')
  headers.set('accept-ranges', 'bytes')
  // Stop browsers from sniffing a `text/plain` SCO file as HTML and executing
  // it; combined with allow-same-origin on the iframe, sniffing widens XSS.
  headers.set('x-content-type-options', 'nosniff')
  // Restrictive CSP for SCORM content: no external scripts.
  headers.set(
    'content-security-policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://player.vimeo.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https:; " +
      "media-src 'self' blob: https://vimeo.com https://player.vimeo.com https://*.vimeocdn.com; " +
      "frame-src 'self' https://player.vimeo.com; " +
      "connect-src 'self' https://player.vimeo.com https://*.vimeo.com https://*.vimeocdn.com; " +
      "frame-ancestors 'self'",
  )
  return headers
}

function getCaptivateRuntimeFallback(relPath: string): string | null {
  const normalised = relPath.replace(/\\/g, '/').toLowerCase()
  if (!normalised.startsWith('assets/htmlimages/')) return null
  const name = normalised.split('/').pop()
  if (!name || !CAPTIVATE_RUNTIME_FALLBACKS.has(name)) return null

  if (name.includes('radio')) {
    const checked = name.includes('checked') && !name.includes('unchecked')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="#fff" stroke="#334155" stroke-width="2"/>${checked ? '<circle cx="14" cy="14" r="5" fill="#2563eb"/>' : ''}</svg>`
  }

  if (name.includes('checkbox')) {
    const selected = name.includes('selected')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="5" y="5" width="18" height="18" rx="3" fill="#fff" stroke="#334155" stroke-width="2"/>${selected ? '<path d="M9 14.5l3.2 3.2L19.5 10" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : ''}</svg>`
  }

  if (name.includes('expand')) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M12 5H5v7M20 5h7v7M12 27H5v-7M20 27h7v-7" fill="none" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#2563eb" stroke-width="3" opacity=".55"/></svg>'
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
  let blobSize: number
  let blobContentType: string
  try {
    const metadata = await head(fullPath)
    blobUrl = metadata.url
    blobSize = metadata.size
    blobContentType = metadata.contentType
  } catch {
    const fallbackSvg = getCaptivateRuntimeFallback(relPath)
    if (fallbackSvg) {
      const headers = buildScormHeaders('image/svg+xml')
      headers.set('content-length', String(new TextEncoder().encode(fallbackSvg).byteLength))
      return new NextResponse(fallbackSvg, { status: 200, headers })
    }
    return new NextResponse('Not found', { status: 404 })
  }

  const range = parseRangeHeader(req.headers.get('range'), blobSize)
  const contentType = blobContentType || 'application/octet-stream'

  if (range === 'invalid') {
    const headers = buildScormHeaders(contentType)
    headers.set('content-range', `bytes */${blobSize}`)
    headers.set('content-length', '0')
    return new NextResponse(null, { status: 416, headers })
  }

  const upstream = await fetch(
    blobUrl,
    range ? { headers: { range: `bytes=${range.start}-${range.end}` } } : undefined,
  )
  if (!upstream.ok) {
    return new NextResponse('Blob fetch failed', { status: 502 })
  }

  // Buffer the full body before returning. Streaming upstream.body through
  // Next.js/Vercel's response pipeline is known to corrupt binary media —
  // see the comment in app/api/tts/route.ts. SCORM packages ship binary
  // assets (images, fonts, videos), so we match the TTS pattern.
  let bytes = new Uint8Array(await upstream.arrayBuffer())
  if (range && upstream.status !== 206) {
    bytes = bytes.subarray(range.start, range.end + 1)
  }

  const headers = buildScormHeaders(
    blobContentType || upstream.headers.get('content-type') || 'application/octet-stream',
  )
  headers.set('content-length', String(bytes.byteLength))

  if (range) {
    headers.set('content-range', `bytes ${range.start}-${range.end}/${blobSize}`)
    return new NextResponse(bytes, { status: 206, headers })
  }

  return new NextResponse(bytes, { status: 200, headers })
}
