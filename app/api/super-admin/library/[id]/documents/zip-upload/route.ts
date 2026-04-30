import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import JSZip from 'jszip'
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS } from '@/lib/upload-validation'

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

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (getExtension(file.name) !== 'zip') {
    return NextResponse.json({ error: 'Please upload a .zip file.' }, { status: 400 })
  }

  if (file.size > MAX_ZIP_SIZE) {
    return NextResponse.json({ error: 'ZIP file exceeds the 200 MB limit.' }, { status: 413 })
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
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

    let blobUrl: string
    try {
      const { url } = await put(`library/documents/${base}`, content, {
        access: 'public',
        addRandomSuffix: true,
        contentType: MIME_MAP[ext] ?? 'application/octet-stream',
      })
      blobUrl = url
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
          fileUrl: blobUrl,
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

  return NextResponse.json({ created, errors, total: entries.length }, { status: 201 })
}
