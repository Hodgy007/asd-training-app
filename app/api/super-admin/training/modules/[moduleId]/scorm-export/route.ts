/**
 * Export a Module as a SCORM 1.2 .zip package.
 *
 * Stream-friendly: builds the zip in memory and returns it with the right
 * Content-Disposition so the browser triggers a download. Gated by the same
 * `MANAGE_TRAINING` permission that protects the SCORM import route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { buildScormExport, type ExportLesson } from '@/lib/scorm/export-builder'

export const runtime = 'nodejs'
export const maxDuration = 300

function safeZipName(title: string): string {
  return title.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'module'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { moduleId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const moduleId = decodeURIComponent(params.moduleId)
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        where: { active: true },
        orderBy: { order: 'asc' },
        include: {
          quizQuestions: { orderBy: { order: 'asc' } },
          attachments: true,
        },
      },
    },
  })

  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  if (mod.lessons.length === 0) {
    return NextResponse.json({ error: 'Module has no active lessons' }, { status: 400 })
  }

  const lessonsForExport: ExportLesson[] = mod.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    type: l.type as ExportLesson['type'],
    content: l.content,
    videoUrl: l.videoUrl,
    transcript: l.transcript,
    interactiveBlocks: l.interactiveBlocks,
    attachments: l.attachments.map((a) => ({ id: a.id, fileName: a.fileName, url: a.url })),
    quizQuestions: l.quizQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
  }))

  let result
  try {
    result = await buildScormExport({
      moduleId: mod.id,
      moduleTitle: mod.title,
      lessons: lessonsForExport,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 400 },
    )
  }

  const filename = `${safeZipName(mod.title)}-scorm.zip`
  const skippedHeader = result.skipped.length
    ? encodeURIComponent(JSON.stringify(result.skipped))
    : ''

  // Convert Buffer to Uint8Array for the Response body — Node's Buffer is a
  // Uint8Array subclass, but the Response BodyInit type is Uint8Array.
  const body = new Uint8Array(result.zip)

  const headers = new Headers({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': String(body.byteLength),
    'Cache-Control': 'no-store',
  })
  if (skippedHeader) {
    headers.set('X-Scorm-Export-Skipped', skippedHeader)
  }

  return new Response(body, { status: 200, headers })
}
