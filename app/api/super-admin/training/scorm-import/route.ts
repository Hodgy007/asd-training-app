/**
 * Create-a-program-from-SCORM endpoint.
 *
 * POST a SCORM 1.2 .zip (and optionally a program name) and you get back
 * `{ programId, moduleId, lessonId }`. Behind the scenes we scaffold:
 *
 *   TrainingProgram (DRAFT, next `order`, un-assigned to any org)
 *     └─ Module (order 0)
 *          └─ Lesson (type SCORM, order 0, scormBlobPrefix/entryPath/version
 *                     populated once the package has been extracted to Blob)
 *
 * The DB rows are created in a transaction up front so we have a stable
 * `lessonId` to key the Blob prefix on. Extraction runs outside the
 * transaction (it uploads to Vercel Blob which can take tens of seconds for
 * large packages); if it fails we delete the program, which cascades the
 * Module and Lesson — no orphan half-scaffolded programs are left behind.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { extractScormPackage } from '@/lib/scorm/package'
import { deriveProgramName, generateScormId } from '@/lib/scorm/import-naming'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_ZIP_BYTES = 200 * 1024 * 1024 // 200 MB — matches the per-lesson route

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const providedName = form.get('name')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: 'Package too large (max 200MB)' }, { status: 413 })
  }
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'Expected a .zip file' }, { status: 400 })
  }

  const programName =
    typeof providedName === 'string' && providedName.trim().length > 0
      ? providedName.trim()
      : deriveProgramName(file.name)

  const buffer = Buffer.from(await file.arrayBuffer())

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
        description: `SCORM package imported from ${file.name}.`,
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
      upload: async (path, body, contentType) => {
        await put(path, body, {
          access: 'public',
          contentType,
          addRandomSuffix: false,
          allowOverwrite: true,
        })
      },
    })

    const updatedLesson = await prisma.lesson.update({
      where: { id: scaffold.lesson.id },
      data: {
        scormBlobPrefix: result.blobPrefix,
        scormEntryPath: result.entryPath,
        scormVersion: result.version,
      },
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
    // Module and Lesson.
    console.error('SCORM import failed — rolling back scaffold', err)
    try {
      await prisma.trainingProgram.delete({ where: { id: scaffold.program.id } })
    } catch (cleanupErr) {
      console.error('SCORM import rollback failed', cleanupErr)
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 400 },
    )
  }
}
