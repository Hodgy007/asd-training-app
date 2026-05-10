/**
 * Bulk brand-asset import from a zip archive.
 *
 * The browser uploads the zip directly to Vercel Blob via the upload-url
 * issuer (`brand-assets-zips/` prefix), then POSTs the resulting blob URL
 * here with the target section type. We fetch the zip back, walk its
 * entries, and create one BrandAsset row per file inside — all assigned to
 * the same section. The source zip is deleted whether the import succeeds
 * or fails so we don't leak storage.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, del } from '@vercel/blob'
import JSZip from 'jszip'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { classifyAssetPath, type BrandAssetType } from '@/lib/brand-assets-classify'

export const runtime = 'nodejs'
export const maxDuration = 300

const BRAND_ASSET_TYPES = ['LOGO', 'BRAND_GUIDELINES', 'IMAGERY', 'COLOUR_PALETTE', 'MESSAGING', 'OTHER'] as const

const bodySchema = z.object({
  blobUrl: z.string().url(),
  type: z.enum(BRAND_ASSET_TYPES),
  // When true, classify each file from its folder/filename and only fall
  // back to `type` when no rule matches. Lets a brand-kit zip with the
  // usual `Logos/`, `Guidelines/`, `Palette/` folders self-organise.
  autoClassify: z.boolean().optional(),
})

const MAX_ZIP_BYTES = 100 * 1024 * 1024 // 100 MB compressed
const MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024 // 500 MB uncompressed
const MAX_PER_FILE_BYTES = 50 * 1024 * 1024 // 50 MB per extracted file
const MAX_ENTRY_COUNT = 200

// Same allowlist as lib/upload-validation.ts. Kept inline because we're
// validating extracted buffers (not File objects) and don't get a browser
// MIME hint to compare against.
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md',
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'mp4', 'webm',
])

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

function isAllowedBlobHost(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return (
    url.protocol === 'https:' &&
    (host === 'blob.vercel-storage.com' ||
      host.endsWith('.public.blob.vercel-storage.com') ||
      host.endsWith('.blob.vercel-storage.com'))
  )
}

function isSafeRelPath(relPath: string): boolean {
  if (!relPath) return false
  if (relPath.includes('\0')) return false
  if (relPath.startsWith('/')) return false
  const normalised = relPath.replace(/\\/g, '/')
  if (normalised.split('/').some((seg) => seg === '..')) return false
  return true
}

function getExtension(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1 || lastDot === name.length - 1) return ''
  return name.slice(lastDot + 1).toLowerCase()
}

function stripExtension(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot <= 0) return name
  return name.slice(0, lastDot)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { blobUrl, type, autoClassify } = parsed.data

  let parsedBlobUrl: URL
  try {
    parsedBlobUrl = new URL(blobUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid blobUrl' }, { status: 400 })
  }
  if (!isAllowedBlobHost(parsedBlobUrl)) {
    return NextResponse.json(
      { error: 'blobUrl must reference a Vercel Blob host' },
      { status: 400 },
    )
  }

  // Fetch + size-cap the zip. Best-effort delete on every failure path so
  // we don't leak the temp upload.
  const zipResponse = await fetch(parsedBlobUrl.toString(), { redirect: 'error' })
  if (!zipResponse.ok) {
    await del(blobUrl).catch(() => {})
    return NextResponse.json(
      { error: `Could not fetch uploaded zip (${zipResponse.status})` },
      { status: 400 },
    )
  }
  const contentLength = Number(zipResponse.headers.get('content-length') ?? '0')
  if (contentLength > MAX_ZIP_BYTES) {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'Zip too large (max 100 MB)' }, { status: 413 })
  }
  const arrayBuffer = await zipResponse.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_ZIP_BYTES) {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'Zip too large (max 100 MB)' }, { status: 413 })
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(Buffer.from(arrayBuffer))
  } catch {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'Could not read zip archive' }, { status: 400 })
  }

  const created: Array<{ id: string; title: string; fileName: string; type: BrandAssetType }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  const bySection: Record<BrandAssetType, number> = {
    LOGO: 0, BRAND_GUIDELINES: 0, IMAGERY: 0, COLOUR_PALETTE: 0, MESSAGING: 0, OTHER: 0,
  }
  let totalUncompressed = 0
  let entryCount = 0

  // Walk entries deterministically so the cap-counting is predictable.
  const entries = Object.values(zip.files).sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    if (entry.dir) continue

    const fullPath = entry.name
    const baseName = fullPath.split('/').pop() ?? ''

    // Skip macOS/Windows zip cruft and dotfiles silently — they're never
    // brand assets and surfacing them as "skipped" is just noise.
    if (
      fullPath.startsWith('__MACOSX/') ||
      baseName === '.DS_Store' ||
      baseName === 'Thumbs.db' ||
      baseName.startsWith('.')
    ) {
      continue
    }

    if (!isSafeRelPath(fullPath)) {
      skipped.push({ name: fullPath, reason: 'unsafe path' })
      continue
    }

    entryCount++
    if (entryCount > MAX_ENTRY_COUNT) {
      skipped.push({ name: fullPath, reason: `entry limit (${MAX_ENTRY_COUNT}) exceeded` })
      break
    }

    const ext = getExtension(baseName)
    if (!ext) {
      skipped.push({ name: fullPath, reason: 'no extension' })
      continue
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      skipped.push({ name: fullPath, reason: `extension .${ext} not allowed` })
      continue
    }

    const buffer = await entry.async('nodebuffer')
    if (buffer.byteLength > MAX_PER_FILE_BYTES) {
      skipped.push({ name: fullPath, reason: 'file exceeds 50 MB' })
      continue
    }
    totalUncompressed += buffer.byteLength
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      skipped.push({ name: fullPath, reason: 'archive exceeds 500 MB uncompressed' })
      break
    }

    const fileType = EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_')

    let uploaded: { url: string }
    try {
      uploaded = await put(`brand-assets/${safeBaseName}`, buffer, {
        access: 'public',
        contentType: fileType,
        addRandomSuffix: true,
      })
    } catch {
      skipped.push({ name: fullPath, reason: 'upload to blob failed' })
      continue
    }

    const title = stripExtension(baseName).slice(0, 200) || baseName
    const resolvedType: BrandAssetType = autoClassify ? classifyAssetPath(fullPath, type) : type
    const asset = await prisma.brandAsset.create({
      data: {
        type: resolvedType,
        title,
        description: null,
        fileUrl: uploaded.url,
        fileName: baseName,
        fileSize: buffer.byteLength,
        fileType,
        active: true,
        uploadedById: session.user.id,
      },
    })
    created.push({ id: asset.id, title: asset.title, fileName: asset.fileName, type: resolvedType })
    bySection[resolvedType]++
  }

  // Always clean up the temp zip — once we've extracted what we need it
  // serves no purpose and just bloats Blob storage.
  await del(blobUrl).catch(() => {})

  return NextResponse.json({
    created: created.length,
    skipped,
    items: created,
    bySection,
  })
}
