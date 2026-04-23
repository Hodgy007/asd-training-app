import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list, del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'
import { extractScormPackage } from '@/lib/scorm/package'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_ZIP_BYTES = 200 * 1024 * 1024 // 200 MB

export async function POST(
  req: NextRequest,
  { params }: { params: { lessonId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: 'Package too large (max 200MB)' }, { status: 413 })
  }
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'Expected a .zip file' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Re-upload cleanup: if this lesson already has a package, delete every
  // blob under its prefix first. Otherwise the new package's files merge with
  // whatever was there before — any asset the old package had but the new one
  // doesn't would remain silently accessible via the serving route. We list
  // and del before extracting so a failed extract doesn't leave a half-wiped
  // lesson (the update() below won't run, so the Lesson keeps its old
  // prefix fields — but the files under that prefix are the new ones).
  const prefix = `scorm/${lesson.id}/`
  try {
    let cursor: string | undefined
    do {
      const page = await list({ prefix, cursor })
      if (page.blobs.length > 0) {
        await del(page.blobs.map((b) => b.url))
      }
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
  } catch (err) {
    console.error('SCORM pre-upload cleanup failed', err)
    // Non-fatal — the extractor uses allowOverwrite, so fresh files still
    // land correctly. Orphans are the only cost.
  }

  try {
    const result = await extractScormPackage({
      zipBuffer: buffer,
      lessonId: lesson.id,
      upload: async (path, body, contentType) => {
        await put(path, body, {
          access: 'public',
          contentType,
          addRandomSuffix: false,
          allowOverwrite: true,
        })
      },
    })

    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        type: 'SCORM',
        scormBlobPrefix: result.blobPrefix,
        scormEntryPath: result.entryPath,
        scormVersion: result.version,
      },
    })

    return NextResponse.json({
      ok: true,
      lesson: {
        id: updated.id,
        scormBlobPrefix: updated.scormBlobPrefix,
        scormEntryPath: updated.scormEntryPath,
        scormVersion: updated.scormVersion,
      },
    })
  } catch (err) {
    console.error('SCORM upload failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 400 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { lessonId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const result = await prisma.lesson.updateMany({
    where: { id: params.lessonId, type: 'SCORM' },
    data: {
      type: 'TEXT',
      scormBlobPrefix: null,
      scormEntryPath: null,
      scormVersion: null,
    },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: 'Not a SCORM lesson' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
