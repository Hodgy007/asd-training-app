import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mapScormStateToProgress, type CmiState } from '@/lib/scorm/progress'

const bodySchema = z.object({
  moduleId: z.string(),
  lessonId: z.string(),
  cmi: z.record(z.string(), z.string()),
  // LMS-level TOC navigation position (leaf href). Capped at 1 KB so a
  // misbehaving client can't write large blobs through this field.
  navLocation: z.string().max(1024).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { moduleId, lessonId, cmi, navLocation } = parsed

  // Only accept progress writes for SCORM lessons — stops stray clients or
  // future refactors from stamping non-SCORM lessons with SCORM-shaped
  // interaction data.
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { type: true, moduleId: true },
  })
  if (!lesson || lesson.type !== 'SCORM' || lesson.moduleId !== moduleId) {
    return NextResponse.json({ error: 'Not a SCORM lesson' }, { status: 404 })
  }

  const update = mapScormStateToProgress(cmi as CmiState, navLocation)

  const saved = await prisma.trainingProgress.upsert({
    where: {
      userId_moduleId_lessonId: { userId: session.user.id, moduleId, lessonId },
    },
    create: {
      userId: session.user.id,
      moduleId,
      lessonId,
      completed: update.completed,
      score: update.score,
      interactionData: update.interactionData,
      completedAt: update.completed ? new Date() : null,
    },
    update: {
      completed: update.completed,
      score: update.score,
      interactionData: update.interactionData,
      completedAt: update.completed ? new Date() : null,
    },
  })

  return NextResponse.json({ ok: true, progressId: saved.id })
}
