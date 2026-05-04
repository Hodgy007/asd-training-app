/**
 * Create-a-program-from-SCORM endpoint.
 *
 * The browser first uploads the .zip directly to Vercel Blob using a token
 * minted by `./upload-url/route.ts` (bypassing the 4.5 MB serverless body
 * limit), then POSTs JSON here:
 *
 *   { blobUrl: string, filename: string, name?: string }
 *
 * We fetch the zip back from Blob, scaffold a draft program/module/lesson in
 * a single transaction, extract the SCORM package to its per-lesson Blob
 * prefix, and finally delete the temporary upload blob. Extraction failures
 * cascade-delete the scaffold so admins never see a half-built program on
 * the training page.
 *
 *   TrainingProgram (DRAFT, next `order`, un-assigned to any org)
 *     └─ Module (order 0)
 *          └─ Lesson (type SCORM, order 0, scormBlobPrefix/entryPath/version
 *                     populated once the package has been extracted to Blob)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, del } from '@vercel/blob'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { extractScormPackage } from '@/lib/scorm/package'
import { deriveProgramName, generateScormId } from '@/lib/scorm/import-naming'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_ZIP_BYTES = 200 * 1024 * 1024 // 200 MB — matches the per-lesson route

// Allowlist of hostnames the import endpoint is willing to fetch from. Anything
// else is rejected to prevent SSRF: a caller with MANAGE_TRAINING could
// otherwise point `blobUrl` at internal services (cloud metadata, private
// network IPs) and get the Lambda to fetch them.
function isAllowedBlobHost(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return (
    url.protocol === 'https:' &&
    (host === 'blob.vercel-storage.com' ||
      host.endsWith('.public.blob.vercel-storage.com') ||
      host.endsWith('.blob.vercel-storage.com'))
  )
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { blobUrl?: unknown; filename?: unknown; name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const blobUrl = typeof body.blobUrl === 'string' ? body.blobUrl : ''
  const filename = typeof body.filename === 'string' ? body.filename : ''
  const providedName = typeof body.name === 'string' ? body.name.trim() : ''

  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing blobUrl' }, { status: 400 })
  }
  if (!filename || !filename.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'Expected a .zip filename' }, { status: 400 })
  }

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

  // Pull the zip back from Blob. The browser uploaded it there via a signed
  // token, so this is an internal fetch of our own bucket over HTTPS.
  const zipResponse = await fetch(parsedBlobUrl.toString(), { redirect: 'error' })
  if (!zipResponse.ok) {
    return NextResponse.json(
      { error: `Could not fetch uploaded zip (${zipResponse.status})` },
      { status: 400 },
    )
  }

  const contentLength = Number(zipResponse.headers.get('content-length') ?? '0')
  if (contentLength > MAX_ZIP_BYTES) {
    // Best-effort cleanup so we don't leave an oversized blob kicking around.
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'Package too large (max 200MB)' }, { status: 413 })
  }

  const arrayBuffer = await zipResponse.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_ZIP_BYTES) {
    await del(blobUrl).catch(() => {})
    return NextResponse.json({ error: 'Package too large (max 200MB)' }, { status: 413 })
  }
  const buffer = Buffer.from(arrayBuffer)

  const programName =
    providedName.length > 0 ? providedName : deriveProgramName(filename)

  // Scaffold program/module/lesson in a single transaction so we never leave
  // an "empty program" visible to admins if we crash between steps.
  const maxOrder = await prisma.trainingProgram.aggregate({ _max: { order: true } })
  const programOrder = (maxOrder._max.order ?? 0) + 1

  const moduleId = generateScormId('module')
  const lessonId = generateScormId('lesson')

  const scaffold = await prisma.$transaction(async (tx) => {
    const program = await tx.trainingProgram.create({
      data: {
        name: programName,
        description: null,
        order: programOrder,
        version: '1.0',
        status: 'DRAFT',
      },
    })

    const mod = await tx.module.create({
      data: {
        id: moduleId,
        title: programName,
        description: `SCORM package imported from ${filename}.`,
        programId: program.id,
        order: 0,
      },
    })

    const lesson = await tx.lesson.create({
      data: {
        id: lessonId,
        moduleId: mod.id,
        title: programName,
        type: 'SCORM',
        content: '',
        order: 0,
      },
    })

    return { program, mod, lesson }
  })

  try {
    const result = await extractScormPackage({
      zipBuffer: buffer,
      lessonId: scaffold.lesson.id,
      upload: async (path, uploadBody, contentType) => {
        await put(path, uploadBody, {
          access: 'public',
          contentType,
          addRandomSuffix: false,
          allowOverwrite: true,
        })
      },
    })

    const importedTitle = result.title?.trim()
    const finalName = providedName.length > 0 ? programName : (importedTitle || programName)

    const [, , updatedLesson] = await prisma.$transaction([
      prisma.trainingProgram.update({
        where: { id: scaffold.program.id },
        data: { name: finalName },
      }),
      prisma.module.update({
        where: { id: scaffold.mod.id },
        data: {
          title: finalName,
          description:
            finalName !== programName
              ? `SCORM package "${finalName}" imported from ${filename}.`
              : `SCORM package imported from ${filename}.`,
        },
      }),
      prisma.lesson.update({
        where: { id: scaffold.lesson.id },
        data: {
          title: finalName,
          scormBlobPrefix: result.blobPrefix,
          scormEntryPath: result.entryPath,
          scormVersion: result.version,
          scormToc: result.toc as unknown as Prisma.InputJsonValue,
        },
      }),
    ])

    // Extraction succeeded — the temp upload blob is no longer needed. Best
    // effort only; a stale temp blob is harmless and cleanup can be swept up
    // later.
    await del(blobUrl).catch((cleanupErr) => {
      console.warn('SCORM import: failed to delete temp upload blob', cleanupErr)
    })

    return NextResponse.json({
      ok: true,
      programId: scaffold.program.id,
      moduleId: scaffold.mod.id,
      lessonId: updatedLesson.id,
    })
  } catch (err) {
    // Extraction or upload failed — roll back the scaffold so admins don't see
    // a half-built program on the training page. Cascade deletes handle the
    // Module and Lesson. Also drop the temp upload blob so we don't accrue
    // storage from failed imports.
    console.error('SCORM import failed — rolling back scaffold', err)
    try {
      await prisma.trainingProgram.delete({ where: { id: scaffold.program.id } })
    } catch (cleanupErr) {
      console.error('SCORM import rollback failed', cleanupErr)
    }
    await del(blobUrl).catch(() => {})
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 400 },
    )
  }
}
