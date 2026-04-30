/**
 * Extract a ZIP archive into individual LibraryDocument records.
 *
 * The browser uploads the .zip directly to Vercel Blob via a token from
 * `./upload-url/route.ts` (bypassing the 4.5 MB serverless body limit), then
 * POSTs JSON here:
 *
 *   { blobUrl: string, filename: string }
 *
 * We fetch the zip back from Blob, walk its entries, validate each file's
 * extension, upload each to Blob under `library/documents/`, and create a
 * LibraryDocument row. The temporary upload blob is deleted after extraction.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { put, del } from '@vercel/blob'
import JSZip from 'jszip'
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS } from '@/lib/upload-validation'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_ZIP_SIZE = 200 * 1024 * 1024 // 200 MB

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1 || lastDot === fileName.length - 1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

function fileNameToTitle(base: string): string {
  const nameWithoutExt = base.replace(/\.[^.]+$/, '')
  return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || base
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collection = await prisma.libraryCollection.findUnique({ where: { id: params.id } })
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  let body: { blobUrl?: unknown; filename?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const blobUrl = typeof body.blobUrl === 'string' ? body.blobUrl : ''
  const filename = typeof body.filename === 'string' ? body.filename : ''

  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing blobUrl' }, { status: 400 })
  }
  if (!filename || !filename.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'Expected a .zip filename' }, { status: 400 })
  }

  // Pull the zip back from Blob — the browser uploaded it there via a signed
  // token, so this is an internal fetch over HTTPS.
  const zipResponse = await fetch(blobUrl)
  if (!zipResponse.ok) {
    return NextResponse.json(
      { error: `Could not fetch uploaded zip (${zipResponse.status})` },
      { status: 400 },
    )
  }

  const contentLength = Number(zipResponse.headers.get('content-length') ?? '0')
  if (contentLength > MAX_ZIP_SIZE) {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'ZIP file exceeds the 200 MB limit.' }, { status: 413 })
  }

  const arrayBuffer = await zipResponse.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_ZIP_SIZE) {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'ZIP file exceeds the 200 MB limit.' }, { status: 413 })
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(arrayBuffer)
  } catch {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'Failed to read ZIP file. Make sure it is a valid ZIP archive.' }, { status: 400 })
  }

  // Filter to actual files, skipping directories and macOS/hidden metadata
  const entries = Object.values(zip.files).filter((entry) => {
    if (entry.dir) return false
    const name = entry.name
    if (name.startsWith('__MACOSX/') || name.includes('/__MACOSX/')) return false
    const base = name.split('/').pop() || ''
    if (base.startsWith('.')) return false
    return true
  })

  const created: object[] = []
  const errors: { fileName: string; error: string }[] = []

  for (const entry of entries) {
    const base = (entry.name.split('/').pop() || entry.name).trim()
    const ext = getExtension(base)

    if (!ext) {
      errors.push({ fileName: base, error: 'No file extension — skipped.' })
      continue
    }
    if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
      errors.push({ fileName: base, error: `".${ext}" files are not allowed for security reasons.` })
      continue
    }
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      errors.push({ fileName: base, error: `".${ext}" is not a supported file type.` })
      continue
    }

    let content: Uint8Array
    try {
      content = await entry.async('uint8array')
    } catch {
      errors.push({ fileName: base, error: 'Failed to extract file from ZIP.' })
      continue
    }

    let extractedUrl: string
    try {
      const { url } = await put(`library/documents/${base}`, Buffer.from(content), {
        access: 'public',
        addRandomSuffix: true,
        contentType: MIME_MAP[ext] ?? 'application/octet-stream',
      })
      extractedUrl = url
    } catch {
      errors.push({ fileName: base, error: 'Storage upload failed.' })
      continue
    }

    try {
      const doc = await prisma.libraryDocument.create({
        data: {
          collectionId: params.id,
          title: fileNameToTitle(base),
          description: 'Uploaded from ZIP.',
          fileUrl: extractedUrl,
          fileName: base,
          fileSize: content.byteLength,
          fileType: MIME_MAP[ext] ?? 'application/octet-stream',
          uploadedById: session.user.id,
        },
      })
      created.push(doc)
    } catch {
      errors.push({ fileName: base, error: 'Failed to save document record.' })
    }
  }

  // Best-effort cleanup of the temp upload blob now that we've extracted it.
  await del(blobUrl).catch(() => {})

  return NextResponse.json({ created, errors, total: entries.length }, { status: 201 })
}
